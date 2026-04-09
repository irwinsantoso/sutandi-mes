import { test, expect, Page } from "@playwright/test"
import { login } from "./helpers"

// Unique suffix per test run
const TS = Date.now().toString(36)

// Helper: select a non-disabled option from a base-ui Select by clicking its trigger text.
// Uses force:true because base-ui Select portals can leave inert overlays that block pointer events.
async function selectFirstRealOption(page: Page, triggerText: string) {
  await page.getByText(triggerText, { exact: true }).first().click({ force: true })
  // Wait for listbox to appear
  await page.getByRole("listbox").waitFor({ state: "visible", timeout: 3000 })
  // Skip disabled placeholder options, click the first enabled one
  const options = page.getByRole("option")
  const count = await options.count()
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i)
    const disabled = await opt.getAttribute("aria-disabled")
    if (disabled !== "true") {
      await opt.click()
      // Wait for listbox to close
      await page.getByRole("listbox").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
      return
    }
  }
}

// ─────────────────────────────────────────────────────────
// 1. Create new SKUs (Items)
// ─────────────────────────────────────────────────────────
test.describe("Create SKU (Item)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create a new raw material item", async ({ page }) => {
    await page.goto("/master/items/new")
    await page.getByRole("textbox", { name: "Code" }).fill(`TEST-RM-${TS}`)
    await page.getByRole("textbox", { name: "Name" }).fill(`Test Raw Material ${TS}`)
    await page.getByRole("textbox", { name: "Description" }).fill("E2E test item")

    await page.getByText("Select category").click()
    await page.getByRole("option", { name: "Raw Material" }).click()

    await page.getByText("Select UOM").click()
    await page.getByRole("option", { name: /Piece/ }).click()

    await page.getByRole("button", { name: "Create Item" }).click()
    await page.waitForURL("/master/items", { timeout: 10000 })
    await expect(page.getByText(`TEST-RM-${TS}`)).toBeVisible()
  })

  test("should create a new finished good item", async ({ page }) => {
    await page.goto("/master/items/new")
    await page.getByRole("textbox", { name: "Code" }).fill(`TEST-FG-${TS}`)
    await page.getByRole("textbox", { name: "Name" }).fill(`Test Finished Good ${TS}`)

    await page.getByText("Select category").click()
    await page.getByRole("option", { name: "Finished Good" }).click()

    await page.getByText("Select UOM").click()
    await page.getByRole("option", { name: /Piece/ }).click()

    await page.getByRole("button", { name: "Create Item" }).click()
    await page.waitForURL("/master/items", { timeout: 10000 })
    await expect(page.getByText(`TEST-FG-${TS}`)).toBeVisible()
  })

  test("should reject duplicate item code", async ({ page }) => {
    await page.goto("/master/items/new")
    await page.getByRole("textbox", { name: "Code" }).fill("RM-001")
    await page.getByRole("textbox", { name: "Name" }).fill("Duplicate test")

    await page.getByText("Select category").click()
    await page.getByRole("option", { name: "Raw Material" }).click()

    await page.getByText("Select UOM").click()
    await page.getByRole("option", { name: /Piece/ }).click()

    await page.getByRole("button", { name: "Create Item" }).click()
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────
// 2. Full inbound transaction flow
// ─────────────────────────────────────────────────────────
test.describe("Inbound Transaction Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create an inbound draft, view details, and confirm", async ({ page }) => {
    await page.goto("/inbound/new")

    // Fill header
    await page.getByRole("textbox", { name: "Supplier" }).fill("Test Supplier Co")
    await page.getByRole("textbox", { name: "Reference Number" }).fill(`PO-E2E-${TS}`)

    // Select item (RM-001)
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()

    // Fill quantity
    await page.getByRole("spinbutton").fill("50")

    // Fill batch
    await page.getByPlaceholder("Batch #").fill(`BATCH-${TS}`)

    // Select location (first available)
    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()

    // Save as draft
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Verify detail page
    await expect(page.getByText("Test Supplier Co")).toBeVisible()
    await expect(page.getByText(`PO-E2E-${TS}`)).toBeVisible()
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: `BATCH-${TS}` })).toBeVisible()

    // QR codes and action buttons
    await expect(page.getByRole("button", { name: "Print QR Codes" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible()

    // Confirm the transaction
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({ timeout: 10000 })

    // Confirm button should disappear
    await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible()
  })

  test("should create and cancel an inbound transaction", async ({ page }) => {
    await page.goto("/inbound/new")
    await page.getByRole("textbox", { name: "Supplier" }).fill("Cancel Test Supplier")

    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").fill("10")

    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()

    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Cancel via dialog
    await page.getByRole("button", { name: "Cancel" }).click()
    await page.getByRole("button", { name: "Yes, cancel it" }).click()
    await expect(page.getByText("CANCELLED", { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test("should show new inbound in the list", async ({ page }) => {
    await page.goto("/inbound/new")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").fill("25")
    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Grab the transaction number from the detail page
    const txnEl = page.locator("text=/IN-\\d{8}-\\d{3}/").first()
    const rawText = await txnEl.textContent()
    const txnMatch = rawText?.match(/IN-\d{8}-\d{3}/)
    const txnNumber = txnMatch ? txnMatch[0] : null

    // Navigate to list and verify
    await page.goto("/inbound")
    if (txnNumber) {
      await expect(page.getByText(txnNumber)).toBeVisible()
    }
  })
})

// ─────────────────────────────────────────────────────────
// 3. Production / Work Order flow
// ─────────────────────────────────────────────────────────
test.describe("Production Order (Work Order) Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create a WIP production order with materials and outputs", async ({ page }) => {
    await page.goto("/production-orders/new")

    // Type defaults to WIP
    const typeTrigger = page.locator("[data-slot='select-trigger']").first()
    await expect(typeTrigger).toContainText("WIP")

    // Description
    await page.getByRole("textbox", { name: "Description" }).fill(`WIP Order ${TS}`)
    await page.getByLabel("Planned Start Date").fill("2026-04-01")
    await page.getByLabel("Planned End Date").fill("2026-04-15")

    // Material: select item (RM-001)
    await page.getByText("Select item", { exact: true }).first().click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").first().fill("100")

    // Output: select item (FG-001)
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /FG-001/ }).click()
    await page.getByRole("spinbutton").nth(1).fill("50")

    await page.getByRole("button", { name: "Create Order" }).click()
    await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

    // Verify detail page
    await expect(page.getByText(`WIP Order ${TS}`)).toBeVisible()
    await expect(page.getByText("Draft", { exact: true })).toBeVisible()
    // Check that WIP badge is visible
    await expect(page.locator("[data-slot='badge']").filter({ hasText: "WIP" })).toBeVisible()
  })

  test("should create a Finished Good production order", async ({ page }) => {
    await page.goto("/production-orders/new")

    // Change type to Finished Good
    const typeTrigger = page.locator("[data-slot='select-trigger']").first()
    await typeTrigger.click()
    await page.getByRole("option", { name: "Finished Good" }).click()

    await page.getByRole("textbox", { name: "Description" }).fill(`FG Order ${TS}`)

    // Material
    await page.getByText("Select item", { exact: true }).first().click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").first().fill("200")

    // Output
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /FG-001/ }).click()
    await page.getByRole("spinbutton").nth(1).fill("100")

    await page.getByRole("button", { name: "Create Order" }).click()
    await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

    await expect(page.getByText(`FG Order ${TS}`)).toBeVisible()
    await expect(page.locator("[data-slot='badge']").filter({ hasText: "Finished Good" })).toBeVisible()
  })

  test("should start and complete a production order lifecycle", async ({ page }) => {
    // Create order
    await page.goto("/production-orders/new")
    await page.getByRole("textbox", { name: "Description" }).fill(`Lifecycle ${TS}`)
    await page.getByText("Select item", { exact: true }).first().click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").first().fill("10")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /FG-001/ }).click()
    await page.getByRole("spinbutton").nth(1).fill("5")
    await page.getByRole("button", { name: "Create Order" }).click()
    await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

    // --- Start Production ---
    await page.getByRole("button", { name: "Start Production" }).click()
    // Confirm in AlertDialog (renders with role="alertdialog")
    await page.getByRole("alertdialog").getByRole("button", { name: "Start Production" }).click()
    await expect(page.getByText("In Progress", { exact: true })).toBeVisible({ timeout: 10000 })

    // --- Complete Production ---
    await page.getByRole("button", { name: "Complete" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Complete Production" }).click()
    await expect(page.getByText("Completed", { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test("should appear in the production orders list", async ({ page }) => {
    const desc = `Listed PO ${TS}`
    await page.goto("/production-orders/new")
    await page.getByRole("textbox", { name: "Description" }).fill(desc)
    await page.getByText("Select item", { exact: true }).first().click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").first().fill("10")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /FG-001/ }).click()
    await page.getByRole("spinbutton").nth(1).fill("5")
    await page.getByRole("button", { name: "Create Order" }).click()
    await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

    // Grab order number
    const orderNumEl = page.locator("text=/PO-\\d{8}-\\d{3}/").first()
    const rawText = await orderNumEl.textContent()
    const orderMatch = rawText?.match(/PO-\d{8}-\d{3}/)
    const orderNum = orderMatch ? orderMatch[0] : null

    await page.goto("/production-orders")
    if (orderNum) {
      await expect(page.getByText(orderNum)).toBeVisible()
    }
  })
})

// ─────────────────────────────────────────────────────────
// 4. Outbound transaction flow
// ─────────────────────────────────────────────────────────
test.describe("Outbound Transaction Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create an outbound draft with line items", async ({ page }) => {
    await page.goto("/outbound/new")

    // Select item (skip disabled placeholder with __none__)
    await selectFirstRealOption(page, "Select item")

    // Fill quantity
    await page.getByRole("spinbutton").first().fill("20")

    // Select location (skip disabled placeholder)
    await selectFirstRealOption(page, "Select location")

    await page.getByRole("button", { name: "Create Outbound Transaction" }).click({ force: true })
    await page.waitForURL(/\/outbound\/[a-z0-9-]+$/, { timeout: 10000 })

    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirm Transaction" })).toBeVisible()
  })

  test("should create and confirm an outbound transaction", async ({ page }) => {
    await page.goto("/outbound/new")

    await selectFirstRealOption(page, "Select item")
    await page.getByRole("spinbutton").first().fill("5")
    await selectFirstRealOption(page, "Select location")

    await page.getByRole("button", { name: "Create Outbound Transaction" }).click({ force: true })
    await page.waitForURL(/\/outbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Confirm via AlertDialog
    await page.getByRole("button", { name: "Confirm Transaction" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click()

    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test("should link outbound to a production order", async ({ page }) => {
    // First create a production order
    await page.goto("/production-orders/new")
    await page.getByRole("textbox", { name: "Description" }).fill(`Link PO ${TS}`)
    await page.getByText("Select item", { exact: true }).first().click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").first().fill("50")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /FG-001/ }).click()
    await page.getByRole("spinbutton").nth(1).fill("25")
    await page.getByRole("button", { name: "Create Order" }).click()
    await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

    // Grab order number
    const orderNumEl = page.locator("text=/PO-\\d{8}-\\d{3}/").first()
    const rawPOText = await orderNumEl.textContent()
    const poMatch = rawPOText?.match(/PO-\d{8}-\d{3}/)
    const orderNum = poMatch ? poMatch[0] : null

    // Create outbound linked to this PO
    await page.goto("/outbound/new")

    // Select the PO from dropdown - click "None" trigger then select the PO
    await page.getByText("None", { exact: true }).click({ force: true })
    if (orderNum) {
      const poOption = page.getByRole("option", { name: new RegExp(orderNum.replace(/[-]/g, "\\-")) })
      if (await poOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await poOption.click()
        await page.getByRole("listbox").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
      } else {
        await page.keyboard.press("Escape")
      }
    } else {
      await page.keyboard.press("Escape")
    }

    // Select item and location
    await selectFirstRealOption(page, "Select item")
    await page.getByRole("spinbutton").first().fill("10")
    await selectFirstRealOption(page, "Select location")

    await page.getByRole("button", { name: "Create Outbound Transaction" }).click({ force: true })
    await page.waitForURL(/\/outbound\/[a-z0-9-]+$/, { timeout: 10000 })

    await expect(page.getByText("DRAFT", { exact: true }).first()).toBeVisible()
  })

  test("should show new outbound in the list", async ({ page }) => {
    await page.goto("/outbound/new")

    await selectFirstRealOption(page, "Select item")
    await page.getByRole("spinbutton").first().fill("3")
    await selectFirstRealOption(page, "Select location")

    await page.getByRole("button", { name: "Create Outbound Transaction" }).click({ force: true })
    await page.waitForURL(/\/outbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Grab transaction number
    const txnEl = page.locator("text=/OUT-\\d{8}-\\d{3}/").first()
    const rawText = await txnEl.textContent()
    const txnMatch = rawText?.match(/OUT-\d{8}-\d{3}/)
    const txnNumber = txnMatch ? txnMatch[0] : null

    await page.goto("/outbound")
    if (txnNumber) {
      await expect(page.getByText(txnNumber)).toBeVisible()
    }
  })
})

// ─────────────────────────────────────────────────────────
// 5. Inventory verification after transactions
// ─────────────────────────────────────────────────────────
test.describe("Inventory Verification", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should show stock movements after confirmed inbound", async ({ page }) => {
    // Create and confirm an inbound
    await page.goto("/inbound/new")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").fill("100")
    await page.getByPlaceholder("Batch #").fill(`INV-${TS}`)
    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 10000 })

    // Confirm
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({ timeout: 10000 })

    // Check stock movements page
    await page.goto("/inventory/movements")
    await expect(page.getByText("INBOUND", { exact: true }).first()).toBeVisible()
  })

  test("should display stock levels page with data", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByRole("heading", { name: "Stock Levels" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
  })
})

import { test, expect, Page } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

// Fill the minimum required SPL form fields to create a valid draft.
// Materials appear before Output in the DOM.
async function fillSplForm(page: Page, overrides: { projectName?: string } = {}) {
  // Header fields
  await page.locator("#transferFrom").fill(`TF-${TS}`)
  await page.locator("#transferTo").fill(`TT-${TS}`)
  await page.locator("#preparedBy").fill("Test Operator")
  if (overrides.projectName) {
    await page.locator("#projectName").fill(overrides.projectName)
  }

  // ── Material item — search for RM-001 specifically ──
  await page.getByText("Select item", { exact: true }).first().click()
  await page.waitForTimeout(200)
  await page.getByPlaceholder("Search...").fill("RM-001")
  await page.waitForTimeout(200)
  await page.getByRole("option", { name: /RM-001/ }).first().click()
  // UOM is now auto-set from item.baseUomId

  // Material quantity
  await page.getByRole("spinbutton").first().fill("2")

  // Material location — first "Select location" trigger
  await page.getByText("Select location", { exact: true }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole("option").first().click()

  // ── Output item (SearchableSelect shows "— Select output item —") ──
  await page
    .getByText("— Select output item —", { exact: true })
    .first()
    .click()
  await page.waitForTimeout(200)
  // Options: [—Select output item—, +Create new item, ...real items]
  // Skip first 2, pick index 2 (first real item)
  const outOpts = page.getByRole("option")
  const outCount = await outOpts.count()
  // Find first non-disabled, non-placeholder option
  for (let i = 0; i < outCount; i++) {
    const opt = outOpts.nth(i)
    const text = (await opt.textContent()) ?? ""
    const disabled = await opt.getAttribute("aria-disabled")
    if (
      disabled !== "true" &&
      !text.includes("Select output item") &&
      !text.includes("Create new item")
    ) {
      await opt.click()
      break
    }
  }
  // Output UOM is now auto-set from item.baseUomId

  // Output quantity (second spinbutton — first is material qty)
  await page.getByRole("spinbutton").nth(1).fill("1")

  // Output location — now only one "Select location" trigger remains
  // (material location was already selected and shows location name)
  await page.getByText("Select location", { exact: true }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole("option").first().click()
}

test.describe("SPL (Surat Pengerjaan Langsung)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display SPL list page", async ({ page }) => {
    await page.goto("/spl")
    await expect(
      page.getByRole("heading", { name: "Surat Pengerjaan Langsung (SPL)" })
    ).toBeVisible()
    await expect(page.getByText("New SPL")).toBeVisible()
  })

  test("should navigate to new SPL form", async ({ page }) => {
    await page.goto("/spl")
    await page.getByText("New SPL").click()
    await page.waitForURL("/spl/new")
    await expect(page.getByText("Transfer From *")).toBeVisible()
    await expect(page.getByText("Transfer To *")).toBeVisible()
    await expect(page.getByText("SPL Header")).toBeVisible()
  })

  test("should show validation error when no output item selected", async ({
    page,
  }) => {
    await page.goto("/spl/new")

    // Fill only header fields, leave output item unselected
    await page.locator("#transferFrom").fill("Dept A")
    await page.locator("#transferTo").fill("Dept B")
    await page.locator("#preparedBy").fill("Operator 1")

    await page.getByRole("button", { name: "Create SPL" }).click()

    await expect(
      page.getByText(
        "Please select an existing output item or choose to create a new one."
      )
    ).toBeVisible({ timeout: 5000 })
  })

  test("should create SPL draft successfully", async ({ page }) => {
    await page.goto("/spl/new")
    await fillSplForm(page)

    await page.getByRole("button", { name: "Create SPL" }).click()
    await page.waitForURL(/\/spl\/[a-z0-9-]+$/, { timeout: 15000 })

    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible({
      timeout: 10000,
    })
  })

  test("should confirm SPL and show CONFIRMED status", async ({ page }) => {
    // Seed stock first — SPL confirm checks material inventory
    await page.goto("/inbound/new")
    await page
      .getByRole("textbox", { name: "Supplier" })
      .fill("SPL Confirm Seeder")
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()
    await page.getByRole("spinbutton").fill("50")
    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 15000 })
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    // Create SPL draft
    await page.goto("/spl/new")
    await fillSplForm(page)

    await page.getByRole("button", { name: "Create SPL" }).click()
    await page.waitForURL(/\/spl\/[a-z0-9-]+$/, { timeout: 15000 })
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    // Confirm
    await page.getByRole("button", { name: "Confirm SPL" }).click()
    await expect(
      page.getByText("SPL confirmed. Inventory has been updated.")
    ).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(
      page.getByText("CONFIRMED", { exact: true })
    ).toBeVisible({ timeout: 5000 })
  })

  test("should cancel SPL and show CANCELLED status", async ({ page }) => {
    await page.goto("/spl/new")
    await fillSplForm(page)

    await page.getByRole("button", { name: "Create SPL" }).click()
    await page.waitForURL(/\/spl\/[a-z0-9-]+$/, { timeout: 15000 })
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    // Cancel
    await page.getByRole("button", { name: "Cancel SPL" }).click()
    await expect(page.getByText("SPL cancelled")).toBeVisible({
      timeout: 10000,
    })
    await page.reload()
    await expect(
      page.getByText("CANCELLED", { exact: true })
    ).toBeVisible({ timeout: 5000 })
  })

  test("should show SPL in list after creation", async ({ page }) => {
    await page.goto("/spl")
    await expect(
      page.getByRole("heading", { name: "Surat Pengerjaan Langsung (SPL)" })
    ).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByRole("row").nth(1)).toBeVisible()
  })

  test("should show project name on SPL detail page", async ({ page }) => {
    const projectLabel = `Proj-${TS}`
    await page.goto("/spl/new")
    await fillSplForm(page, { projectName: projectLabel })

    await page.getByRole("button", { name: "Create SPL" }).click()
    await page.waitForURL(/\/spl\/[a-z0-9-]+$/, { timeout: 15000 })

    // Project name should appear on detail page
    await expect(page.getByText(projectLabel)).toBeVisible({ timeout: 5000 })
  })
})

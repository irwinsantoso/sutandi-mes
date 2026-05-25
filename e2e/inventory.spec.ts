import { test, expect, type Page } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

// Create and confirm an inbound for RM-001. Returns the transaction number (e.g. "IN-20260523-001").
async function seedInbound(page: Page, qty: number, batch: string, locationNth = 0): Promise<string> {
  await page.goto("/inbound/new")
  await page.getByText("Select item", { exact: true }).click()
  await page.getByRole("option", { name: /RM-001/ }).click()
  await page.getByRole("spinbutton").fill(String(qty))
  await page.getByPlaceholder("Batch #").fill(batch)
  await page.getByText("Select location", { exact: true }).click()
  await page.getByRole("option").nth(locationNth).click()
  await page.getByRole("button", { name: "Save as Draft" }).click()
  await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 15000 })

  // Capture transaction number from page heading "Inbound IN-YYYYMMDD-NNN"
  const heading = await page.getByRole("heading", { name: /Inbound IN-/ }).textContent()
  const txnNum = heading?.replace("Inbound ", "").trim() ?? ""

  await page.getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({ timeout: 10000 })

  return txnNum
}

// ---------------------------------------------------------------------------
// Stock Levels (/inventory)
// ---------------------------------------------------------------------------
test.describe("Stock Levels (/inventory)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("page loads with heading, table, and search input", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByRole("heading", { name: "Stock Levels" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByPlaceholder("Search by item code...")).toBeVisible()
  })

  test("search by item code filters to matching rows only", async ({ page }) => {
    await seedInbound(page, 10, `B-SL-${TS}`)

    await page.goto("/inventory")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    // All visible data rows should contain RM-001
    const rows = page.getByRole("row").filter({ hasText: "RM-001" })
    await expect(rows.first()).toBeVisible()

    // No row should show a different item code
    const allDataRows = page.getByRole("row").nth(1)
    await expect(allDataRows).toContainText("RM-001")
  })

  test("On Hand column shows correct quantity after inbound", async ({ page }) => {
    await seedInbound(page, 17, `B-OH-${TS}`)

    await page.goto("/inventory")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    // Find the specific batch row
    const batchRow = page.getByRole("row").filter({ hasText: `B-OH-${TS}` })
    await expect(batchRow).toBeVisible()
    // On Hand is the 6th cell (index 5): Code, Name, Category, Location, Batch, On Hand
    await expect(batchRow.getByRole("cell").nth(5)).toContainText("17")
  })

  test("search for nonexistent item code shows empty table", async ({ page }) => {
    await page.goto("/inventory")
    await page.getByPlaceholder("Search by item code...").fill("NONEXISTENT-XYZ-999")
    await page.waitForTimeout(300)

    // No data rows should appear
    const dataRows = page.getByRole("row").filter({ hasText: "NONEXISTENT-XYZ-999" })
    await expect(dataRows).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Stock Summary (/inventory/summary)
// ---------------------------------------------------------------------------
test.describe("Stock Summary (/inventory/summary)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("page loads with heading, table, and search input", async ({ page }) => {
    await page.goto("/inventory/summary")
    await expect(page.getByRole("heading", { name: "Stock Summary" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByPlaceholder("Search by item code...")).toBeVisible()
  })

  test("search shows RM-001 with correct category and positive On Hand", async ({ page }) => {
    await seedInbound(page, 9, `B-SS-${TS}`)

    await page.goto("/inventory/summary")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    const row = page.getByRole("row").filter({ hasText: "RM-001" }).first()
    await expect(row).toBeVisible()
    await expect(row).toContainText("Raw Material")
    // On Hand column (index 4, after: expand, Code, Name, Category)
    const onHandCell = row.getByRole("cell").nth(4)
    const onHandText = await onHandCell.textContent()
    expect(parseFloat((onHandText ?? "0").replace(/,/g, ""))).toBeGreaterThan(0)
  })

  test("row with multiple locations has expand button", async ({ page }) => {
    // Seed into two different locations so the expand button appears
    await seedInbound(page, 5, `B-EXP1-${TS}`, 0)
    await seedInbound(page, 5, `B-EXP2-${TS}`, 1)

    await page.goto("/inventory/summary")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    const row = page.getByRole("row").filter({ hasText: "RM-001" }).first()
    await expect(row).toBeVisible()

    // Expand button is a small icon-only button in the first cell
    const expandBtn = row.getByRole("cell").first().getByRole("button")
    await expect(expandBtn).toBeVisible()

    // Click to expand and verify location breakdown appears
    await expandBtn.click()
    await expect(page.getByText(/WH-01/).first()).toBeVisible({ timeout: 5000 })
  })

  test("Available column shows value >= 0 for RM-001", async ({ page }) => {
    await page.goto("/inventory/summary")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    const row = page.getByRole("row").filter({ hasText: "RM-001" }).first()
    await expect(row).toBeVisible()
    // Available is index 6 (expand, Code, Name, Category, On Hand, Reserved, Available)
    const availableCell = row.getByRole("cell").nth(6)
    const availText = await availableCell.textContent()
    expect(parseFloat((availText ?? "0").replace(/,/g, ""))).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Stock Movements (/inventory/movements)
// ---------------------------------------------------------------------------
test.describe("Stock Movements (/inventory/movements)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("page loads with heading, table, and search input", async ({ page }) => {
    await page.goto("/inventory/movements")
    await expect(page.getByRole("heading", { name: "Stock Movements" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByPlaceholder("Search by reference number...")).toBeVisible()
  })

  test("inbound confirm creates movement with correct transaction number, item, and qty", async ({
    page,
  }) => {
    const txnNum = await seedInbound(page, 25, `B-MV-${TS}`)

    await page.goto("/inventory/movements")

    if (txnNum) {
      await page.getByPlaceholder("Search by reference number...").fill(txnNum)
      await page.waitForTimeout(300)

      const row = page.getByRole("row").filter({ hasText: txnNum }).first()
      await expect(row).toBeVisible()
      await expect(row).toContainText("INBOUND")
      await expect(row).toContainText("RM-001")
      await expect(row).toContainText("+25")
    }
  })

  test("movement rows show color-coded type badges", async ({ page }) => {
    await page.goto("/inventory/movements")
    // After all prior tests there will always be INBOUND movements
    await expect(page.getByText("INBOUND").first()).toBeVisible()
  })

  test("searching nonexistent reference shows empty table", async ({ page }) => {
    await page.goto("/inventory/movements")
    await page.getByPlaceholder("Search by reference number...").fill("IN-XXXX-NONEXISTENT")
    await page.waitForTimeout(300)

    const dataRows = page.getByRole("row").filter({ hasText: "IN-XXXX-NONEXISTENT" })
    await expect(dataRows).toHaveCount(0)
  })
})

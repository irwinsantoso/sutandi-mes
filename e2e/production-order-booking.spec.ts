import { test, expect, type Page } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedStock(page: Page, qty: number) {
  await page.goto("/inbound/new")
  await page.getByText("Select item", { exact: true }).click()
  await page.getByRole("option", { name: /RM-001/ }).click()
  await page.getByRole("spinbutton").fill(String(qty))
  await page.getByText("Select location", { exact: true }).click()
  await page.getByRole("option").first().click()
  await page.getByRole("button", { name: "Save as Draft" }).click()
  await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 15000 })
  await page.getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({ timeout: 10000 })
}

// Create a WO (DRAFT) with RM-001 as material. Returns { orderNum, url }.
async function createWO(
  page: Page,
  materialQty: number,
  projectName?: string
): Promise<{ orderNum: string; url: string }> {
  await page.goto("/production-orders/new")
  if (projectName) {
    await page.getByLabel("Nama Proyek").fill(projectName)
  }
  await page.getByRole("textbox", { name: "Description" }).fill(`Booking-${TS}`)

  // Material: RM-001
  await page.getByText("Select item", { exact: true }).first().click()
  await page.getByRole("option", { name: /RM-001/ }).click()
  await page.getByRole("spinbutton").first().fill(String(materialQty))

  // Output: FG-001 (second "Select item" after material is filled)
  await page.getByText("Select item", { exact: true }).click()
  await page.getByRole("option", { name: /FG-001/ }).click()
  await page.getByRole("spinbutton").nth(1).fill("1")

  await page.getByRole("button", { name: "Create Order" }).click()
  await page.waitForURL(/\/production-orders\/[a-z0-9-]+$/, { timeout: 10000 })

  const heading = await page
    .getByRole("heading", { name: /Production Order PO-/ })
    .textContent()
  const orderNum = heading?.replace("Production Order ", "").trim() ?? ""
  return { orderNum, url: page.url() }
}

async function startWO(page: Page) {
  await page.getByRole("button", { name: "Start Production" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Start Production" }).click()
  await expect(page.getByText("In Progress", { exact: true })).toBeVisible({ timeout: 10000 })
}

async function completeWO(page: Page) {
  await page.getByRole("button", { name: "Complete" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Complete Production" }).click()
  await expect(page.getByText("Completed", { exact: true })).toBeVisible({ timeout: 10000 })
}

async function cancelWO(page: Page) {
  await page.getByRole("button", { name: "Cancel Order" }).first().click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel Order" }).click()
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible({ timeout: 10000 })
}

// Read On Hand / Reserved / Available / Booked-by-WO for an item from Stock Summary.
async function getSummaryRow(page: Page, itemCode: string) {
  await page.goto("/inventory/summary")
  await page.getByPlaceholder("Search by item code...").fill(itemCode)
  await page.waitForTimeout(300)

  const row = page.getByRole("row").filter({ hasText: itemCode }).first()
  const parse = (t: string | null) =>
    !t || t.trim() === "-" ? 0 : parseFloat(t.replace(/,/g, ""))

  // Columns: expand(0) Code(1) Name(2) Category(3) OnHand(4) Reserved(5) Available(6) UOM(7) BookedWO(8)
  const onHand    = parse(await row.getByRole("cell").nth(4).textContent())
  const reserved  = parse(await row.getByRole("cell").nth(5).textContent())
  const available = parse(await row.getByRole("cell").nth(6).textContent())
  const bookedWO  = (await row.getByRole("cell").nth(8).textContent()) ?? ""

  return { onHand, reserved, available, bookedWO }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Production Order — Nama Proyek", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("project name is saved and shown on detail page", async ({ page }) => {
    const project = `Proyek-${TS}`
    await createWO(page, 5, project)

    // Project name should appear in the Order Information card
    await expect(page.getByText(project)).toBeVisible()
  })

  test("project name appears in production orders list", async ({ page }) => {
    const project = `Listed-${TS}`
    const { orderNum } = await createWO(page, 3, project)

    await page.goto("/production-orders")
    const row = page.getByRole("row").filter({ hasText: orderNum }).first()
    await expect(row).toContainText(project)
  })
})

test.describe("Production Order — Stock Reservation (Booking)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("active WO (DRAFT or IN_PROGRESS) increases reserved in summary by material qty", async ({ page }) => {
    const MATERIAL_QTY = 8
    await seedStock(page, 50)

    // Measure BEFORE creating the WO — summary counts DRAFT WOs in Reserved too
    const before = await getSummaryRow(page, "RM-001")

    const { url: woUrl } = await createWO(page, MATERIAL_QTY)
    await page.goto(woUrl)
    await startWO(page)

    const after = await getSummaryRow(page, "RM-001")
    expect(after.reserved).toBe(before.reserved + MATERIAL_QTY)
  })

  test("Booked by WO column shows the active order number after start", async ({ page }) => {
    const MATERIAL_QTY = 6
    await seedStock(page, 30)
    const { orderNum } = await createWO(page, MATERIAL_QTY)
    await startWO(page)

    const { bookedWO } = await getSummaryRow(page, "RM-001")
    expect(bookedWO).toContain(orderNum)
  })

  test("Available = On Hand − Reserved after WO is started", async ({ page }) => {
    await seedStock(page, 40)
    await createWO(page, 7)
    await startWO(page)

    const { onHand, reserved, available } = await getSummaryRow(page, "RM-001")
    // available may differ by rounding; use closeTo
    expect(available).toBeCloseTo(onHand - reserved, 4)
  })

  test("completing WO releases the reserved quantity", async ({ page }) => {
    const MATERIAL_QTY = 5
    await seedStock(page, 30)
    const { url: woUrl } = await createWO(page, MATERIAL_QTY)
    await startWO(page)

    const afterStart = await getSummaryRow(page, "RM-001")
    expect(afterStart.reserved).toBeGreaterThanOrEqual(MATERIAL_QTY)

    await page.goto(woUrl)
    await completeWO(page)

    const afterComplete = await getSummaryRow(page, "RM-001")
    expect(afterComplete.reserved).toBe(afterStart.reserved - MATERIAL_QTY)
  })

  test("cancelling IN_PROGRESS WO releases the reserved quantity", async ({ page }) => {
    const MATERIAL_QTY = 4
    await seedStock(page, 30)
    const { url: woUrl } = await createWO(page, MATERIAL_QTY)
    await startWO(page)

    const afterStart = await getSummaryRow(page, "RM-001")
    expect(afterStart.reserved).toBeGreaterThanOrEqual(MATERIAL_QTY)

    await page.goto(woUrl)
    await cancelWO(page)

    const afterCancel = await getSummaryRow(page, "RM-001")
    expect(afterCancel.reserved).toBe(afterStart.reserved - MATERIAL_QTY)
  })

  test("cancelling DRAFT WO restores reserved to pre-creation baseline", async ({ page }) => {
    await seedStock(page, 20)

    // Measure BEFORE creating the WO
    const before = await getSummaryRow(page, "RM-001")

    const { url: woUrl } = await createWO(page, 3)
    await page.goto(woUrl)
    await cancelWO(page)

    const after = await getSummaryRow(page, "RM-001")
    expect(after.reserved).toBe(before.reserved)
  })
})

test.describe("Production Order — Stock Levels Reserved Column", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("Reserved column in Stock Levels shows > 0 when WO is active", async ({ page }) => {
    await seedStock(page, 25)
    await createWO(page, 9)
    await startWO(page)

    // Check /inventory (Stock Levels) Reserved column for RM-001
    await page.goto("/inventory")
    await page.getByPlaceholder("Search by item code...").fill("RM-001")
    await page.waitForTimeout(300)

    // Find a row that has reserved qty (> 0). Reserved column index 6:
    // Code(0) Name(1) Category(2) Location(3) Batch(4) OnHand(5) Reserved(6) Available(7)
    const rows = page.getByRole("row").filter({ hasText: "RM-001" })
    const count = await rows.count()
    let totalReserved = 0
    for (let i = 0; i < count; i++) {
      const cell = rows.nth(i).getByRole("cell").nth(6)
      const text = (await cell.textContent()) ?? ""
      if (text.trim() !== "-") {
        totalReserved += parseFloat(text.replace(/,/g, ""))
      }
    }
    expect(totalReserved).toBeGreaterThan(0)
  })
})

import { test, expect, Page } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

// Helper: select a non-disabled option from a base-ui Select
async function selectFirstRealOption(page: Page, triggerText: string) {
  await page.getByText(triggerText, { exact: true }).first().click({ force: true })
  await page.getByRole("listbox").waitFor({ state: "visible", timeout: 3000 })
  const options = page.getByRole("option")
  const count = await options.count()
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i)
    const disabled = await opt.getAttribute("aria-disabled")
    if (disabled !== "true") {
      await opt.click()
      await page
        .getByRole("listbox")
        .waitFor({ state: "hidden", timeout: 3000 })
        .catch(() => {})
      return
    }
  }
}

test.describe("Partial Outbound with QR Scanning", () => {
  // Shared state across tests in this describe block
  let qrPayloadJson: string
  let inboundBatch: string
  let inboundQty: number

  test.beforeAll(async ({ browser }) => {
    // ──────────────────────────────────────────────
    // SETUP: Create and confirm an inbound transaction
    // so we have inventory + QR code data to scan
    // ──────────────────────────────────────────────
    inboundBatch = `QR-E2E-${TS}`
    inboundQty = 10

    const page = await browser.newPage()
    await login(page)

    await page.goto("/inbound/new")
    await page.getByRole("textbox", { name: "Supplier" }).fill("QR Test Supplier")
    await page.getByRole("textbox", { name: "Reference Number" }).fill(`QR-REF-${TS}`)

    // Select first item (RM-001)
    await page.getByText("Select item", { exact: true }).click()
    await page.getByRole("option", { name: /RM-001/ }).click()

    // Fill quantity
    await page.getByRole("spinbutton").fill(String(inboundQty))

    // Fill batch
    await page.getByPlaceholder("Batch #").fill(inboundBatch)

    // Select first location
    await page.getByText("Select location", { exact: true }).click()
    await page.getByRole("option").first().click()

    // Save as draft
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await page.waitForURL(/\/inbound\/[a-z0-9-]+$/, { timeout: 15000 })

    // Confirm to create inventory
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    // Extract QR code data from the page
    // The QR codes section has the raw qrCodeData stored during inbound creation.
    // We can reconstruct a QR payload from the visible data on the detail page.
    const txnEl = page.locator("text=/IN-\\d{8}-\\d{3}/").first()
    const rawTxnText = await txnEl.textContent()
    const txnMatch = rawTxnText?.match(/IN-\d{8}-\d{3}/)
    const txnNumber = txnMatch ? txnMatch[0] : "IN-00000000-000"

    // Build the QR payload JSON that would be encoded in the QR code
    // This matches the format from inbound-actions.ts encodeQrPayload
    const today = new Date().toISOString().split("T")[0]
    qrPayloadJson = JSON.stringify({
      id: "",
      txn: txnNumber,
      item: "RM-001",
      batch: inboundBatch,
      qty: inboundQty,
      uom: "PCS",
      date: today,
    })

    await page.screenshot({
      path: "e2e/screenshots/01-inbound-confirmed.png",
      fullPage: true,
    })

    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ─────────────────────────────────────────────────────────
  // Test 1: Scan QR → auto-parse on Enter → fields populated
  // ─────────────────────────────────────────────────────────
  test("should auto-parse QR data on Enter key (scanner emulation)", async ({
    page,
  }) => {
    await page.goto("/outbound/new")

    await page.screenshot({
      path: "e2e/screenshots/02-outbound-new-blank.png",
      fullPage: true,
    })

    // Click "Scan QR" button to open the QR input
    await page.getByRole("button", { name: "Scan QR" }).click()

    // Verify the QR input area appeared with the hint text
    await expect(
      page.getByText("Scan or paste QR data (scanner auto-submits on Enter)")
    ).toBeVisible()

    await page.screenshot({
      path: "e2e/screenshots/03-qr-input-open.png",
      fullPage: true,
    })

    // The QR input should be auto-focused
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await expect(qrInput).toBeFocused()

    // Simulate scanner: type the QR JSON data and press Enter
    await qrInput.fill(qrPayloadJson)
    await qrInput.press("Enter")

    // Wait for toast success message
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    await page.screenshot({
      path: "e2e/screenshots/04-qr-parsed-full-qty.png",
      fullPage: true,
    })

    // Verify fields were auto-populated
    // Item select should show RM-001
    await expect(page.getByText(/RM-001/).first()).toBeVisible()

    // Quantity should be filled with the QR qty
    const qtyInput = page.getByRole("spinbutton").first()
    await expect(qtyInput).toHaveValue(String(inboundQty))

    // QR Scanned badge should appear
    await expect(page.getByText("QR Scanned")).toBeVisible()

    // QR label qty indicator should show
    await expect(
      page.getByText(`QR label qty: ${inboundQty}`)
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────
  // Test 2: Partial outbound — reduce qty, see remaining
  // ─────────────────────────────────────────────────────────
  test("should show partial indicator when reducing quantity below QR label", async ({
    page,
  }) => {
    await page.goto("/outbound/new")

    // Scan QR
    await page.getByRole("button", { name: "Scan QR" }).click()
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill(qrPayloadJson)
    await qrInput.press("Enter")
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    // Full qty is shown
    await expect(
      page.getByText(`QR label qty: ${inboundQty}`)
    ).toBeVisible()

    // Now reduce quantity to partial amount (3 out of 10)
    const qtyInput = page.getByRole("spinbutton").first()
    await qtyInput.fill("3")

    await page.screenshot({
      path: "e2e/screenshots/05-partial-qty-3-of-10.png",
      fullPage: true,
    })

    // Should show partial indicator with remaining
    const remaining = inboundQty - 3
    await expect(page.getByText(`(partial: ${remaining} remaining)`)).toBeVisible()

    // Should still show the original QR label qty
    await expect(
      page.getByText(`QR label qty: ${inboundQty}`)
    ).toBeVisible()

    // No warning about exceeding should be visible
    await expect(page.getByText(/Warning: outbound qty exceeds/)).not.toBeVisible()
  })

  // ─────────────────────────────────────────────────────────
  // Test 3: Exceeds QR label — warning shown
  // ─────────────────────────────────────────────────────────
  test("should show warning when quantity exceeds QR label qty", async ({
    page,
  }) => {
    await page.goto("/outbound/new")

    // Scan QR
    await page.getByRole("button", { name: "Scan QR" }).click()
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill(qrPayloadJson)
    await qrInput.press("Enter")
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    // Increase quantity beyond label (15 when label is 10)
    const qtyInput = page.getByRole("spinbutton").first()
    await qtyInput.fill("15")

    await page.screenshot({
      path: "e2e/screenshots/06-exceeds-qty-warning.png",
      fullPage: true,
    })

    // Warning should be visible
    const excess = 15 - inboundQty
    await expect(
      page.getByText(`Warning: outbound qty exceeds QR label qty by ${excess}`)
    ).toBeVisible()

    // Partial indicator should NOT be visible
    await expect(page.getByText(/\(partial:/)).not.toBeVisible()
  })

  // ─────────────────────────────────────────────────────────
  // Test 4: Full take — no partial, no warning
  // ─────────────────────────────────────────────────────────
  test("should show no warning or partial when qty equals QR label qty", async ({
    page,
  }) => {
    await page.goto("/outbound/new")

    // Scan QR
    await page.getByRole("button", { name: "Scan QR" }).click()
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill(qrPayloadJson)
    await qrInput.press("Enter")
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    // Quantity should already be the full amount
    const qtyInput = page.getByRole("spinbutton").first()
    await expect(qtyInput).toHaveValue(String(inboundQty))

    await page.screenshot({
      path: "e2e/screenshots/07-full-qty-no-warnings.png",
      fullPage: true,
    })

    // QR label qty should be shown
    await expect(
      page.getByText(`QR label qty: ${inboundQty}`)
    ).toBeVisible()

    // No partial indicator
    await expect(page.getByText(/\(partial:/)).not.toBeVisible()

    // No exceeds warning
    await expect(page.getByText(/Warning: outbound qty exceeds/)).not.toBeVisible()
  })

  // ─────────────────────────────────────────────────────────
  // Test 5: Create partial outbound end-to-end
  // ─────────────────────────────────────────────────────────
  test("should create and confirm a partial outbound transaction", async ({
    page,
  }) => {
    await page.goto("/outbound/new")

    // Scan QR
    await page.getByRole("button", { name: "Scan QR" }).click()
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill(qrPayloadJson)
    await qrInput.press("Enter")
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    // Reduce to partial qty
    const qtyInput = page.getByRole("spinbutton").first()
    await qtyInput.fill("4")

    // Verify partial indicator
    await expect(page.getByText(`(partial: ${inboundQty - 4} remaining)`)).toBeVisible()

    // Select location
    await selectFirstRealOption(page, "Select location")

    await page.screenshot({
      path: "e2e/screenshots/08-partial-outbound-ready.png",
      fullPage: true,
    })

    // Submit the outbound transaction
    await page
      .getByRole("button", { name: "Create Outbound Transaction" })
      .click({ force: true })
    await page.waitForURL(/\/outbound\/[a-z0-9-]+$/, { timeout: 15000 })

    await page.screenshot({
      path: "e2e/screenshots/09-partial-outbound-draft.png",
      fullPage: true,
    })

    // Verify draft was created
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible()

    // Verify the QR scanned badge is shown in detail
    await expect(page.getByText("QR Scanned").first()).toBeVisible()

    // Confirm the transaction
    await page.getByRole("button", { name: "Confirm Transaction" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Confirm" })
      .click()
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    await page.screenshot({
      path: "e2e/screenshots/10-partial-outbound-confirmed.png",
      fullPage: true,
    })
  })

  // ─────────────────────────────────────────────────────────
  // Test 6: Verify stock summary page shows the item
  // ─────────────────────────────────────────────────────────
  test("should display stock summary with inventory data", async ({ page }) => {
    await page.goto("/inventory/summary")

    await page.screenshot({
      path: "e2e/screenshots/11-stock-summary.png",
      fullPage: true,
    })

    await expect(
      page.getByRole("heading", { name: "Stock Summary" })
    ).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()

    // Search for the item we used
    const searchInput = page.getByPlaceholder("Search by item code...")
    await searchInput.fill("RM-001")

    await page.screenshot({
      path: "e2e/screenshots/12-stock-summary-filtered.png",
      fullPage: true,
    })

    // RM-001 should appear in the table
    await expect(page.getByText("RM-001").first()).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────
  // Test 7: Manual Parse button still works
  // ─────────────────────────────────────────────────────────
  test("should parse QR data via Parse button click", async ({ page }) => {
    await page.goto("/outbound/new")

    // Click "Scan QR" to open input
    await page.getByRole("button", { name: "Scan QR" }).click()

    // Type QR data but do NOT press Enter
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill(qrPayloadJson)

    // Click Parse button instead
    await page.getByRole("button", { name: "Parse" }).click()

    // Should still parse successfully
    await expect(page.getByText("QR data parsed successfully")).toBeVisible({
      timeout: 5000,
    })

    // Fields should be populated
    await expect(page.getByText(/RM-001/).first()).toBeVisible()
    await expect(page.getByText(`QR label qty: ${inboundQty}`)).toBeVisible()

    await page.screenshot({
      path: "e2e/screenshots/13-parse-button-works.png",
      fullPage: true,
    })
  })

  // ─────────────────────────────────────────────────────────
  // Test 8: Invalid QR data shows error toast
  // ─────────────────────────────────────────────────────────
  test("should show error for invalid QR data", async ({ page }) => {
    await page.goto("/outbound/new")

    await page.getByRole("button", { name: "Scan QR" }).click()
    const qrInput = page.getByPlaceholder('{"id":"...","txn":"...","item":"..."}')
    await qrInput.fill("this-is-not-valid-json")
    await qrInput.press("Enter")

    await expect(
      page.getByText("Invalid QR code data. Could not parse.")
    ).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "e2e/screenshots/14-invalid-qr-error.png",
      fullPage: true,
    })

    // No QR label qty should appear
    await expect(page.getByText(/QR label qty:/)).not.toBeVisible()
  })
})

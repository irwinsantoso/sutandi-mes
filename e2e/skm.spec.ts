import { test, expect, Page } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

const SKM_DETAIL_URL = (url: URL) =>
  url.pathname.startsWith("/skm/") && url.pathname !== "/skm/new"

async function createSkmDraft(page: Page, itemName: string, qty: string, uom: string) {
  await page.goto("/skm/new")
  await page.getByPlaceholder("Item description").first().fill(itemName)
  await page.getByPlaceholder("0", { exact: true }).first().fill(qty)
  await page.getByPlaceholder("Pcs").first().fill(uom)

  // Start listening for URL change BEFORE clicking to avoid race condition
  const navPromise = page.waitForURL(SKM_DETAIL_URL, { timeout: 20000 })
  await page.getByRole("button", { name: "Save as Draft" }).click()
  await navPromise
  // Reload to get fresh server render with client components
  await page.reload()
}

test.describe("SKM (Material Requests)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display SKM list page", async ({ page }) => {
    await page.goto("/skm")
    await expect(
      page.getByRole("heading", { name: "Material Requests (SKM)" })
    ).toBeVisible()
    await expect(page.getByText("New SKM")).toBeVisible()
  })

  test("should navigate to new SKM form", async ({ page }) => {
    await page.goto("/skm")
    await page.getByText("New SKM").click()
    await page.waitForURL("/skm/new")
    await expect(page.getByText("Request Details")).toBeVisible()
    await expect(page.getByText("Material Items")).toBeVisible()
  })

  test("should show validation error when no line items filled", async ({
    page,
  }) => {
    await page.goto("/skm/new")
    await page.getByRole("button", { name: "Save as Draft" }).click()
    await expect(
      page.getByText("At least one complete line item (name, qty, UOM) is required.")
    ).toBeVisible({ timeout: 5000 })
  })

  test("should create SKM draft successfully", async ({ page }) => {
    await createSkmDraft(page, `Material-${TS}`, "10", "PCS")
    await expect(page.getByText("DRAFT").first()).toBeVisible({ timeout: 10000 })
  })

  test("should confirm SKM and show CONFIRMED status", async ({ page }) => {
    await createSkmDraft(page, `Confirm-Mat-${TS}`, "5", "KG")
    await expect(page.getByText("DRAFT").first()).toBeVisible({ timeout: 10000 })

    await page.getByText("Confirm").first().click()
    await page.reload()
    await expect(page.getByText("CONFIRMED").first()).toBeVisible({
      timeout: 10000,
    })
  })

  test("should cancel SKM via alert dialog and show CANCELLED status", async ({
    page,
  }) => {
    await createSkmDraft(page, `Cancel-Mat-${TS}`, "3", "PCS")
    await expect(page.getByText("DRAFT").first()).toBeVisible({ timeout: 10000 })

    await page.getByText("Cancel").first().click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Yes, cancel it" })
      .click()
    await page.reload()
    await expect(page.getByText("CANCELLED").first()).toBeVisible({
      timeout: 10000,
    })
  })

  test("should show SKM in list after creation", async ({ page }) => {
    await page.goto("/skm")
    await expect(
      page.getByRole("heading", { name: "Material Requests (SKM)" })
    ).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByRole("row").nth(1)).toBeVisible()
  })
})

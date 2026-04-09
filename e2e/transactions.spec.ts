import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Inbound Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display inbound list page", async ({ page }) => {
    await page.goto("/inbound")
    await expect(page.getByRole("heading", { name: "Inbound" })).toBeVisible()
    await expect(page.getByRole("link", { name: "New Inbound" })).toBeVisible()
  })

  test("should navigate to new inbound form", async ({ page }) => {
    await page.goto("/inbound")
    await page.getByRole("link", { name: "New Inbound" }).click()
    await page.waitForURL("/inbound/new")
    await expect(page.getByText("Supplier")).toBeVisible()
    await expect(page.getByText("Receiving Date")).toBeVisible()
  })

  test("should show item and UOM selects with proper labels", async ({ page }) => {
    await page.goto("/inbound/new")
    // Item select should show placeholder
    await expect(page.getByText("Select item").first()).toBeVisible()
    // UOM select should show placeholder
    await expect(page.getByText("Select UOM").first()).toBeVisible()
    // Location select should show placeholder
    await expect(page.getByText("Select location").first()).toBeVisible()
  })
})

test.describe("Outbound Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display outbound list page", async ({ page }) => {
    await page.goto("/outbound")
    await expect(page.getByRole("heading", { name: "Outbound" })).toBeVisible()
    await expect(page.getByRole("link", { name: "New Outbound" })).toBeVisible()
  })

  test("should navigate to new outbound form", async ({ page }) => {
    await page.goto("/outbound")
    await page.getByRole("link", { name: "New Outbound" }).click()
    await page.waitForURL("/outbound/new")
    await expect(page.getByText("Production Order (Optional)")).toBeVisible()
    await expect(page.getByText("Issue Date")).toBeVisible()
  })
})

test.describe("Production Orders", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display production orders list page", async ({ page }) => {
    await page.goto("/production-orders")
    await expect(page.getByRole("heading", { name: "Production Orders" })).toBeVisible()
    await expect(page.getByRole("link", { name: "New Order" })).toBeVisible()
  })

  test("should navigate to new production order form", async ({ page }) => {
    await page.goto("/production-orders")
    await page.getByRole("link", { name: "New Order" }).click()
    await page.waitForURL("/production-orders/new")
    await expect(page.getByText("Order Details")).toBeVisible()
  })

  test("should show type select with proper labels", async ({ page }) => {
    await page.goto("/production-orders/new")
    // The type select may have a default value or show "Select type"
    const typeLabel = page.getByLabel("Type")
    await expect(typeLabel).toBeVisible()
    // Open the type select
    const trigger = page.locator("[data-slot='select-trigger']").first()
    await trigger.click()
    await expect(page.getByRole("option", { name: "WIP" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Finished Good" })).toBeVisible()
  })
})

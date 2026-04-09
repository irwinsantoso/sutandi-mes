import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Dashboard and Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display dashboard with KPI cards", async ({ page }) => {
    await expect(page.getByText("Total Items")).toBeVisible()
    await expect(page.getByText("Pending Inbound")).toBeVisible()
    await expect(page.getByText("Active Production Orders")).toBeVisible()
    await expect(page.getByText("Low Stock Items")).toBeVisible()
  })

  test("should navigate via sidebar links", async ({ page }) => {
    // Inbound
    await page.getByRole("link", { name: "Inbound" }).click()
    await page.waitForURL("/inbound")
    await expect(page.getByRole("heading", { name: "Inbound" })).toBeVisible()

    // Outbound
    await page.getByRole("link", { name: "Outbound" }).click()
    await page.waitForURL("/outbound")
    await expect(page.getByRole("heading", { name: "Outbound" })).toBeVisible()

    // Production Orders
    await page.getByRole("link", { name: "Production Orders" }).click()
    await page.waitForURL("/production-orders")
    await expect(page.getByRole("heading", { name: "Production Orders" })).toBeVisible()

    // Stock Levels
    await page.getByRole("link", { name: "Stock Levels" }).click()
    await page.waitForURL("/inventory")
    await expect(page.getByRole("heading", { name: "Stock Levels" })).toBeVisible()

    // Stock Movements
    await page.getByRole("link", { name: "Stock Movements" }).click()
    await page.waitForURL("/inventory/movements")
    await expect(page.getByRole("heading", { name: "Stock Movements" })).toBeVisible()
  })

  test("should show breadcrumbs", async ({ page }) => {
    await page.goto("/master/items")
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "breadcrumb" }).getByText("Master Data")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "breadcrumb" }).getByText("Items")).toBeVisible()
  })
})

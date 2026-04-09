import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Master Data - UOM", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display UOM list page", async ({ page }) => {
    await page.goto("/master/uom")
    await expect(page.getByRole("heading", { name: "Unit of Measure" })).toBeVisible()
    // Seed data should include pcs, pack, bundle
    const table = page.getByRole("table")
    await expect(table.getByRole("cell", { name: "Piece" })).toBeVisible()
    await expect(table.getByRole("cell", { name: "Pack", exact: true })).toBeVisible()
    await expect(table.getByRole("cell", { name: "Bundle", exact: true })).toBeVisible()
  })
})

test.describe("Master Data - Items", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display items list page", async ({ page }) => {
    await page.goto("/master/items")
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible()
    // Table should exist with data rows
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByRole("row").nth(1)).toBeVisible()
  })

  test("should show category labels correctly in table", async ({ page }) => {
    await page.goto("/master/items")
    // Table cells should contain human-readable category badges
    await expect(page.getByText("Raw Material", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Finished Good", { exact: true }).first()).toBeVisible()
  })

  test("should navigate to new item form", async ({ page }) => {
    await page.goto("/master/items")
    await page.getByRole("link", { name: "Add Item" }).click()
    await page.waitForURL("/master/items/new")
    await expect(page.getByRole("heading", { name: "New Item" })).toBeVisible()
  })

  test("should show correct labels in category select", async ({ page }) => {
    await page.goto("/master/items/new")
    // Click the Category combobox
    await page.getByText("Select category").click()
    // Should show human-readable labels in dropdown
    await expect(page.getByRole("option", { name: "Raw Material" })).toBeVisible()
    await expect(page.getByRole("option", { name: "WIP" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Finished Good" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Packaging" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Consumable" })).toBeVisible()
  })

  test("should display label (not ID) after selecting category", async ({ page }) => {
    await page.goto("/master/items/new")
    // Open category dropdown and select "Finished Good"
    await page.getByText("Select category").click()
    await page.getByRole("option", { name: "Finished Good" }).click()
    // The trigger should show "Finished Good" in the select value
    const trigger = page.locator("[data-slot='select-trigger']").first()
    await expect(trigger).toContainText("Finished Good")
  })
})

test.describe("Master Data - Warehouses", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display warehouses list page", async ({ page }) => {
    await page.goto("/master/warehouses")
    await expect(page.getByRole("heading", { name: "Warehouses" })).toBeVisible()
    // Seed data warehouse
    await expect(page.getByText("WH-01")).toBeVisible()
  })
})

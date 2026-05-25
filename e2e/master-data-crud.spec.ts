import { test, expect } from "@playwright/test"
import { login } from "./helpers"

const TS = Date.now().toString(36)

test.describe("Master Data CRUD - UOM", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should open Add UOM dialog and create a new UOM", async ({ page }) => {
    await page.goto("/master/uom")
    await page.getByRole("button", { name: "Add UOM" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Add UOM")).toBeVisible()

    await dialog.getByLabel("Code").fill(`U${TS}`)
    await dialog.getByLabel("Name").fill(`TestUnit-${TS}`)
    await dialog.getByRole("button", { name: "Create UOM" }).click()

    // Dialog should close and new UOM appear in table
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(`U${TS}`)).toBeVisible({ timeout: 5000 })
  })

  test("should open Edit UOM dialog from table row actions", async ({
    page,
  }) => {
    await page.goto("/master/uom")
    // Open the action dropdown on the first data row
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "Edit" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Edit UOM")).toBeVisible()
    // Close dialog
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe("Master Data CRUD - Item Categories", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should open Add Category dialog and create a new category", async ({
    page,
  }) => {
    await page.goto("/master/categories")
    await expect(
      page.getByRole("heading", { name: "Item Categories" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Add Category" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Add Category")).toBeVisible()

    await dialog.getByLabel("Code").fill(`CAT${TS}`)
    await dialog.getByLabel("Name").fill(`TestCategory-${TS}`)
    await dialog.getByRole("button", { name: "Create Category" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(`CAT${TS}`)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Master Data CRUD - Warehouses & Locations", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create a new warehouse", async ({ page }) => {
    await page.goto("/master/warehouses")
    await page.getByRole("button", { name: "Add Warehouse" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Add Warehouse")).toBeVisible()

    await dialog.getByLabel("Code").fill(`WH${TS}`)
    await dialog.getByLabel("Name").fill(`TestWarehouse-${TS}`)
    await dialog.getByRole("button", { name: "Create Warehouse" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(`WH${TS}`)).toBeVisible({ timeout: 5000 })
  })

  test("should navigate to warehouse detail and add a location", async ({
    page,
  }) => {
    // Navigate to warehouse detail via "View Locations" dropdown menu
    await page.goto("/master/warehouses")
    // Open the action menu for the first row (WH-01 from seed)
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "View Locations" }).click()
    await page.waitForURL(/\/master\/warehouses\/[a-z0-9-]+$/, {
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Add Location" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Add Location")).toBeVisible()

    await dialog.getByLabel("Code").fill(`LOC${TS}`)
    await dialog.getByLabel("Name").fill(`TestLocation-${TS}`)
    await dialog.getByRole("button", { name: "Create Location" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(`LOC${TS}`)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Master Data CRUD - Items", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should create a new item via form", async ({ page }) => {
    await page.goto("/master/items/new")
    await expect(page.getByRole("heading", { name: "New Item" })).toBeVisible()

    await page.getByLabel("Code").fill(`IT${TS}`)
    await page.getByLabel("Name").fill(`TestItem-${TS}`)

    // Select category
    await page.getByText("Select category").click()
    await page.getByRole("option", { name: "Raw Material" }).click()

    // Select base UOM
    await page.getByText("Select UOM").click()
    await page.getByRole("option").first().click()

    await page.getByRole("button", { name: "Create Item" }).click()
    await page.waitForURL(/\/master\/items\/[a-z0-9-]+$/, { timeout: 10000 })

    await expect(page.getByText(`IT${TS}`)).toBeVisible({ timeout: 5000 })
  })

  test("should navigate to item edit page via dropdown", async ({ page }) => {
    await page.goto("/master/items")
    // Use dropdown menu to go directly to Edit page
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "Edit" }).click()
    await page.waitForURL(/\/master\/items\/[a-z0-9-]+\/edit$/, {
      timeout: 10000,
    })
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible()
  })

  test("should view item detail page via dropdown", async ({ page }) => {
    await page.goto("/master/items")
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "View" }).click()
    // URL: /master/items/[id]  (no /edit suffix)
    await page.waitForURL(/\/master\/items\/(?!new)[a-z0-9-]+$/, { timeout: 10000 })

    // Scoped to main to avoid sidebar collisions
    const main = page.locator("main")
    await expect(main.getByText("Item Information")).toBeVisible()
    await expect(page.getByRole("button", { name: "Add Conversion" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Edit Item" })).toBeVisible()
    // Item code shown in info card
    await expect(main.getByText(/RM-|IT|FG-|BUNDLE/).first()).toBeVisible()
  })
})

test.describe("Master Data CRUD - Warehouses (Edit)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should open Edit Warehouse dialog with pre-filled values", async ({ page }) => {
    await page.goto("/master/warehouses")
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Edit Warehouse")).toBeVisible()
    // Code and Name fields should be pre-filled
    await expect(dialog.getByLabel("Code")).not.toHaveValue("")
    await expect(dialog.getByLabel("Name")).not.toHaveValue("")

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })
  })

  test("should save warehouse address via Edit dialog", async ({ page }) => {
    await page.goto("/master/warehouses")
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Edit Warehouse")).toBeVisible()

    await dialog.getByLabel("Address").fill(`Jl. Test Warehouse ${TS}`)
    await dialog.getByRole("button", { name: "Save Changes" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(`Jl. Test Warehouse ${TS}`)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Master Data CRUD - Item Categories (Edit)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should open Edit Category dialog with pre-filled values", async ({ page }) => {
    await page.goto("/master/categories")
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Open menu" })
      .click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Edit Category")).toBeVisible()
    await expect(dialog.getByLabel("Code")).not.toHaveValue("")
    await expect(dialog.getByLabel("Name")).not.toHaveValue("")

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe("Master Data - UOM Conversions (/master/uom/conversions)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("page loads with heading, description, table, and search", async ({ page }) => {
    await page.goto("/master/uom/conversions")
    await expect(page.getByRole("heading", { name: "UOM Conversions" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByPlaceholder("Search by item code...")).toBeVisible()
  })

  test("search filters the conversion table", async ({ page }) => {
    await page.goto("/master/uom/conversions")
    // Search for something that won't match
    await page.getByPlaceholder("Search by item code...").fill("NONEXISTENT-999")
    await page.waitForTimeout(300)
    const rows = page.getByRole("row").filter({ hasText: "NONEXISTENT-999" })
    await expect(rows).toHaveCount(0)
  })
})

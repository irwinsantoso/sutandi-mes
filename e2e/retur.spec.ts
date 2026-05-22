import { test, expect } from "@playwright/test"
import { login } from "./helpers"

// ---------------------------------------------------------------------------
// Retur Inbound
// ---------------------------------------------------------------------------
test.describe("Retur Inbound", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("list page loads with correct heading and new button", async ({ page }) => {
    await page.goto("/retur-inbound")
    await expect(page.getByRole("heading", { name: "Retur Inbound" })).toBeVisible()
    await expect(page.getByText("Retur Inbound Baru")).toBeVisible()
    // Table headers only visible when records exist — check card title instead
    await expect(page.getByText(/Semua Retur Inbound/)).toBeVisible()
  })

  test("new form renders all required fields", async ({ page }) => {
    await page.goto("/retur-inbound/new")
    await expect(page.getByLabel("Nama Proyek")).toBeVisible()
    await expect(page.getByLabel("Customer (Pengembali)")).toBeVisible()
    await expect(page.getByLabel("Tanggal Penerimaan Retur")).toBeVisible()
    await expect(page.getByText("Item yang Diretur")).toBeVisible()
    await expect(page.getByRole("button", { name: "Simpan Draft Retur" })).toBeVisible()
  })

  test("shows validation error when submitting without items", async ({ page }) => {
    await page.goto("/retur-inbound/new")
    // Submit without filling any line item — triggers "At least one complete line item is required."
    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()
    await expect(page.getByText(/least one|required|wajib/i)).toBeVisible()
  })

  test("creates a draft retur inbound with project name and confirms it", async ({ page }) => {
    await page.goto("/retur-inbound/new")

    await page.getByLabel("Nama Proyek").fill("Proyek Test Retur")
    await page.getByLabel("Customer (Pengembali)").fill("Customer ABC")

    // Item select — SearchableSelect wraps SelectTrigger (data-slot="select-trigger")
    const selectTriggers = page.locator("[data-slot='select-trigger']")
    await selectTriggers.first().click()
    await page.getByPlaceholder("Search...").fill("RM-001")
    await page.getByRole("option", { name: /RM-001/ }).first().click()

    // Quantity
    await page.getByPlaceholder("0").first().fill("5")

    // Location select (second select-trigger in the form)
    await selectTriggers.nth(2).click()
    await page.getByPlaceholder("Search...").last().fill("WH-01")
    await page.getByRole("option", { name: /WH-01/ }).first().click()

    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()

    await page.waitForURL(/\/retur-inbound\/(?!new)[^/]+/)
    await expect(page.getByText("DRAFT")).toBeVisible()
    await expect(page.getByText("Proyek Test Retur").first()).toBeVisible()

    // Confirm the retur
    await page.getByRole("button", { name: "Confirm Retur" }).click()
    // revalidatePath triggers RSC re-render; wait for badge to update automatically
    await expect(page.getByText("CONFIRMED")).toBeVisible({ timeout: 15000 })
  })

  test("can cancel a draft retur inbound", async ({ page }) => {
    await page.goto("/retur-inbound/new")

    await page.getByLabel("Customer (Pengembali)").fill("Customer Cancel Test")

    const selectTriggers = page.locator("[data-slot='select-trigger']")
    await selectTriggers.first().click()
    await page.getByPlaceholder("Search...").fill("RM-001")
    await page.getByRole("option", { name: /RM-001/ }).first().click()
    await page.getByPlaceholder("0").first().fill("2")

    await selectTriggers.nth(2).click()
    await page.getByPlaceholder("Search...").last().fill("WH-01")
    await page.getByRole("option", { name: /WH-01/ }).first().click()

    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()
    await page.waitForURL(/\/retur-inbound\/(?!new)[^/]+/)

    page.on("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByText("CANCELLED")).toBeVisible({ timeout: 15000 })
  })

  test("new retur inbound appears in list with project name", async ({ page }) => {
    await page.goto("/retur-inbound")
    await expect(page.getByText("Proyek Test Retur").first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Retur Outbound
// ---------------------------------------------------------------------------
test.describe("Retur Outbound", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("list page loads with correct heading and new button", async ({ page }) => {
    await page.goto("/retur-outbound")
    await expect(page.getByRole("heading", { name: "Retur Outbound" })).toBeVisible()
    await expect(page.getByText("Retur Outbound Baru")).toBeVisible()
    await expect(page.getByText(/Semua Retur Outbound/)).toBeVisible()
  })

  test("new form renders all required fields", async ({ page }) => {
    await page.goto("/retur-outbound/new")
    await expect(page.getByLabel("Nama Proyek")).toBeVisible()
    await expect(page.getByLabel("Supplier (Tujuan Retur)")).toBeVisible()
    await expect(page.getByLabel("Tanggal Retur")).toBeVisible()
    await expect(page.getByText("Item yang Diretur")).toBeVisible()
    await expect(page.getByRole("button", { name: "Simpan Draft Retur" })).toBeVisible()
  })

  test("shows validation error when submitting without items", async ({ page }) => {
    await page.goto("/retur-outbound/new")
    // Submit without filling any item — triggers "Minimal satu item harus lengkap."
    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()
    await expect(page.getByText(/satu item|least one|required|wajib/i)).toBeVisible()
  })

  test("creates a draft retur outbound with project name and confirms it", async ({ page }) => {
    await page.goto("/retur-outbound/new")

    await page.getByLabel("Nama Proyek").fill("Proyek Test Retur Keluar")
    await page.getByLabel("Supplier (Tujuan Retur)").fill("Supplier XYZ")

    const selectTriggers = page.locator("[data-slot='select-trigger']")
    await selectTriggers.first().click()
    await page.getByPlaceholder("Search...").fill("RM-001")
    await page.getByRole("option", { name: /RM-001/ }).first().click()

    await page.getByPlaceholder("0").first().fill("3")

    // Location
    await selectTriggers.nth(2).click()
    await page.getByPlaceholder("Search...").last().fill("WH-01")
    await page.getByRole("option", { name: /WH-01/ }).first().click()

    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()

    await page.waitForURL(/\/retur-outbound\/.+/)
    await expect(page.getByText("DRAFT")).toBeVisible()
    await expect(page.getByText("Proyek Test Retur Keluar").first()).toBeVisible()

    await page.getByRole("button", { name: "Confirm Retur" }).click()
    // revalidatePath triggers RSC re-render; wait for badge to update automatically
    await expect(page.getByText("CONFIRMED")).toBeVisible({ timeout: 15000 })
  })

  test("can cancel a draft retur outbound", async ({ page }) => {
    await page.goto("/retur-outbound/new")

    await page.getByLabel("Supplier (Tujuan Retur)").fill("Supplier Cancel Test")

    const selectTriggers = page.locator("[data-slot='select-trigger']")
    await selectTriggers.first().click()
    await page.getByPlaceholder("Search...").fill("RM-001")
    await page.getByRole("option", { name: /RM-001/ }).first().click()
    await page.getByPlaceholder("0").first().fill("1")

    await selectTriggers.nth(2).click()
    await page.getByPlaceholder("Search...").last().fill("WH-01")
    await page.getByRole("option", { name: /WH-01/ }).first().click()

    await page.getByRole("button", { name: "Simpan Draft Retur" }).click()
    await page.waitForURL(/\/retur-outbound\/(?!new)[^/]+/)

    page.on("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByText("CANCELLED")).toBeVisible({ timeout: 15000 })
  })

  test("new retur outbound appears in list with project name", async ({ page }) => {
    await page.goto("/retur-outbound")
    await expect(page.getByText("Proyek Test Retur Keluar").first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Project Name feature
// ---------------------------------------------------------------------------
test.describe("Project Name field", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("retur inbound form has project name field", async ({ page }) => {
    await page.goto("/retur-inbound/new")
    await expect(page.getByLabel("Nama Proyek")).toBeVisible()
  })

  test("retur outbound form has project name field", async ({ page }) => {
    await page.goto("/retur-outbound/new")
    await expect(page.getByLabel("Nama Proyek")).toBeVisible()
  })

  test("production order form has project name field", async ({ page }) => {
    await page.goto("/production-orders/new")
    await expect(page.getByLabel("Nama Proyek")).toBeVisible()
  })

  test("retur inbound datalist offers existing project names", async ({ page }) => {
    await page.goto("/retur-inbound/new")
    const projectInput = page.getByLabel("Nama Proyek")
    await expect(projectInput).toBeVisible()
    const listId = await projectInput.getAttribute("list")
    expect(listId).toBeTruthy()
    await expect(page.locator(`datalist#${listId}`)).toBeAttached()
  })

  test("project name saved to retur inbound shows in detail page", async ({ page }) => {
    await page.goto("/retur-inbound")
    await expect(page.getByText("Proyek Test Retur").first()).toBeVisible()
  })

  test("project name saved to retur outbound shows in detail page", async ({ page }) => {
    await page.goto("/retur-outbound")
    await expect(page.getByText("Proyek Test Retur Keluar").first()).toBeVisible()
  })
})

import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Import Module", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should display import page with import type select", async ({
    page,
  }) => {
    await page.goto("/import")
    await expect(page.getByText("Import Configuration")).toBeVisible()
    await expect(page.getByText("Import Type")).toBeVisible()
    await expect(page.getByText("Select what to import")).toBeVisible()
  })

  test("should show download template button after selecting import type", async ({
    page,
  }) => {
    await page.goto("/import")

    // Open import type select
    await page.getByText("Select what to import").click()
    // Select first option (whatever it is)
    await page.getByRole("option").first().click()

    // Download Template button should appear
    await expect(
      page.getByRole("button", { name: "Download Template" })
    ).toBeVisible()
  })

  test("should list available import types in select", async ({ page }) => {
    await page.goto("/import")

    await page.getByText("Select what to import").click()
    // There should be at least one option
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 3000 })
    const count = await page.getByRole("option").count()
    expect(count).toBeGreaterThan(0)

    // Close dropdown
    await page.keyboard.press("Escape")
  })

  test("should navigate to import via sidebar", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Import" }).click()
    await page.waitForURL("/import")
    await expect(page.getByText("Import Configuration")).toBeVisible()
  })
})

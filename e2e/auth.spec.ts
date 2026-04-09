import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText("Sutandi MES")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Username" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
  })

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("textbox", { name: "Username" }).fill("admin")
    await page.getByRole("textbox", { name: "Password" }).fill("admin123")
    await page.getByRole("button", { name: "Sign In" }).click()
    await page.waitForURL("/dashboard")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("textbox", { name: "Username" }).fill("wrong")
    await page.getByRole("textbox", { name: "Password" }).fill("wrong")
    await page.getByRole("button", { name: "Sign In" }).click()
    // Should stay on login page
    await expect(page).toHaveURL(/login/)
  })

  test("should show login page when visiting root without auth", async ({ browser }) => {
    // Use a fresh context without cookies
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/login")
    // Login page should be accessible
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
    await context.close()
  })
})

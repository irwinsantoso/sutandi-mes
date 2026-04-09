import { Page } from "@playwright/test"

export async function login(page: Page) {
  await page.goto("/login")
  await page.getByRole("textbox", { name: "Username" }).fill("admin")
  await page.getByRole("textbox", { name: "Password" }).fill("admin123")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL("/dashboard")
}

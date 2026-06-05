import { test, expect } from "@playwright/test";

// Uses the seeded demo admin (npm run db:seed): lead@1086.test / bluecheese.
const EMAIL = process.env.E2E_EMAIL ?? "lead@1086.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "bluecheese";

test("lead can sign in and view the strategic dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();

  await page.goto("/dashboard/rankings");
  await expect(page.getByText("Composite")).toBeVisible();
});

test("unauthenticated dashboard redirects to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

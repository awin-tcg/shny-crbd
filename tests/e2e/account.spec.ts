import { expect, test } from "@playwright/test";

test("header avatar opens the account page with identity details", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Account" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Account" }),
  ).toBeVisible();
  await expect(page.getByText("demo-user")).toBeVisible();
  await expect(page.getByText("Development identity (mock)")).toBeVisible();

  const signOut = page.getByRole("button", { name: "Sign out" });
  await expect(signOut).toBeDisabled();
  await expect(signOut).toHaveAccessibleDescription(/no session to end/);
});

test("collector requests an export, then requests and cancels deletion", async ({
  page,
}) => {
  await page.goto("/account");

  await page.getByRole("button", { name: "Request data export" }).click();
  await expect(page.getByText(/Export requested/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request data export" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Delete account…" }).click();
  const confirm = page.getByRole("group", { name: /Delete this account/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Request deletion" }).click();
  await expect(page.getByText(/Deletion requested/)).toBeVisible();

  await page.getByRole("button", { name: "Keep my account" }).click();
  await expect(
    page.getByRole("button", { name: "Delete account…" }),
  ).toBeVisible();
});

test("resetting the introduction brings the banner back", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Dismiss portfolio introduction" })
    .click();
  await page.reload();
  await expect(page.getByText("Know what you hold.")).toHaveCount(0);

  await page.goto("/account");
  await page
    .getByRole("button", { name: "Show portfolio introduction again" })
    .click();
  await expect(page.getByText(/will appear the next time/)).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Know what you hold.")).toBeVisible();
});

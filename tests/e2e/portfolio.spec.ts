import { expect, test } from "@playwright/test";

test("collector sees portfolio value and exact-variant holdings", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Know what you hold." }),
  ).toBeVisible();
  await expect(page.getByText("Market value").first()).toBeVisible();
  await expect(page.getByText("Charizard")).toBeVisible();
  await expect(page.getByText(/near mint/i)).toBeVisible();
});

test("collector searches and adds a card", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Card, set, or number").fill("Blue-Eyes");
  await page.getByRole("button", { name: "Search" }).click();

  const result = page
    .getByRole("article")
    .filter({ hasText: "Blue-Eyes White Dragon" });
  await expect(result).toBeVisible();
  await result.getByLabel("Total cost (USD)").fill("500");
  await result.getByRole("button", { name: "Add to portfolio" }).click();
  await expect(result.getByText("Added to your portfolio.")).toBeVisible();
});

test("roadmap tabs keep vendor data separate", async ({ page }) => {
  await page.goto("/vendor");
  await expect(
    page.getByRole("heading", { name: "Run the booth, not a spreadsheet." }),
  ).toBeVisible();
  await expect(page.getByText(/no MVP portfolio data/i)).toBeVisible();
});

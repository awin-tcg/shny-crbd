import { expect, test } from "@playwright/test";

test("collector analyzes exact variants, quantities, cash, and missing prices", async ({
  page,
}) => {
  await page.goto("/trade");
  await expect(
    page.getByRole("heading", { name: "Price the whole trade." }),
  ).toBeVisible();
  await expect(page.getByText("Nothing on this page is saved.")).toBeVisible();

  const yourSide = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Your side" }) });
  const otherSide = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Other side" }) });

  await yourSide.getByLabel("Search your side catalog").fill("Charizard");
  await yourSide.getByRole("button", { name: "Search" }).click();
  await yourSide
    .getByRole("button", { name: "Add Charizard to your side" })
    .click();
  await yourSide
    .getByRole("button", { name: "Increase Charizard quantity" })
    .click();
  await yourSide.getByLabel("Cash (USD)").fill("10");

  await otherSide.getByLabel("Search other side catalog").fill("Luffy");
  await otherSide.getByRole("button", { name: "Search" }).click();
  await otherSide
    .getByRole("button", { name: "Add Monkey.D.Luffy to other side" })
    .click();
  await otherSide.getByLabel("Cash (USD)").fill("800");

  await page.getByLabel("Incoming card value percentage").fill("85");

  const giveSummary = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "You give" }) });
  const receiveSummary = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "You receive" }) });
  await expect(giveSummary).toContainText("Raw card market$850.00");
  await expect(giveSummary).toContainText("Effective total$860.00");
  await expect(receiveSummary).toContainText("Raw card market$98.00");
  await expect(receiveSummary).toContainText("Adjusted cards (85%)$83.30");
  await expect(receiveSummary).toContainText("Effective total$883.30");
  await expect(page.getByText("Advantage: you")).toBeVisible();
  await expect(page.getByText("Difference: +$23.30 · +2.71%")).toBeVisible();

  await otherSide.getByLabel("Search other side catalog").fill("Gundam");
  await otherSide.getByRole("button", { name: "Search" }).click();
  await otherSide
    .getByRole("button", { name: "Add RX-78-2 Gundam to other side" })
    .click();
  await expect(
    page.getByText(/1 card has a missing or stale price/i),
  ).toBeVisible();
  await otherSide
    .getByRole("button", { name: "Remove RX-78-2 Gundam from other side" })
    .click();
  await expect(
    page.getByText(/1 card has a missing or stale price/i),
  ).toHaveCount(0);
});

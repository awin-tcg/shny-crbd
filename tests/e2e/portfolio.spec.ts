import { expect, test } from "@playwright/test";

test("collector sees portfolio value and exact-variant holdings", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Know what you hold." }),
  ).toBeVisible();
  await expect(page.getByText("Market value").first()).toBeVisible();
  const holdings = page.locator('[data-dashboard-section="holdings"]');
  await expect(holdings.getByText("Charizard").first()).toBeVisible();
  await expect(holdings.getByText(/near mint/i).first()).toBeVisible();
});

test("portfolio introduction dismisses and stays dismissed", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Know what you hold." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portfolio", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Dismiss portfolio introduction" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Know what you hold." }),
  ).toHaveCount(0);

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Know what you hold." }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Portfolio", exact: true }),
  ).toBeVisible();
  const preference = await page.evaluate(() =>
    localStorage.getItem("crdbrd.portfolio-onboarding.dismissed.v1"),
  );
  expect(preference).toBe("true");
});

test("desktop keeps top navigation with an accessible active state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const desktopNavigation = page.locator(".desktop-navigation");
  await expect(desktopNavigation).toBeVisible();
  await expect(page.locator(".mobile-navigation")).toBeHidden();
  await expect(
    desktopNavigation.getByRole("link", { name: "Portfolio" }),
  ).toHaveAttribute("aria-current", "page");

  await desktopNavigation.getByRole("link", { name: "Search" }).click();
  await expect(
    desktopNavigation.getByRole("link", { name: "Search" }),
  ).toHaveAttribute("aria-current", "page");
});

test("mobile uses a clear bottom navigation without duplicating landmarks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const mobileNavigation = page.locator(".mobile-navigation");
  await expect(mobileNavigation).toBeVisible();
  await expect(page.locator(".desktop-navigation")).toBeHidden();
  await expect(page.getByRole("navigation")).toHaveCount(1);
  await expect(
    mobileNavigation.getByRole("link", { name: "Portfolio" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    mobileNavigation.getByRole("link", { name: "Portfolio" }),
  ).toHaveCSS("min-height", "54px");
  await expect(mobileNavigation.getByRole("link")).toHaveCount(3);
});

test("dashboard presents totals and chart before secondary details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const sectionOrder = await page
    .locator("[data-dashboard-section]:visible")
    .evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-dashboard-section")),
    );

  expect(sectionOrder).toEqual(["totals", "chart", "holdings"]);
  const pricedMetric = page
    .locator(".metric")
    .filter({ hasText: "Priced cards" });
  await expect(pricedMetric.locator(".metric-value")).toHaveText(/\d+ of \d+/);
  await expect(pricedMetric.locator(".metric-sub")).toHaveText(
    /missing or stale|Exact variant/,
  );
  await expect(page.getByText("Valuation coverage")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /portfolio value changed/i }),
  ).toBeVisible();
  await expect(
    page.getByText("Latest snapshot", { exact: false }),
  ).toBeVisible();
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

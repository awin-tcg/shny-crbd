import { expect, test, type Page } from "@playwright/test";

const luffyId = "22222222-2222-4222-8222-222222222221";

function visibleSections(page: Page) {
  return page
    .locator("[data-dashboard-section]:visible")
    .evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-dashboard-section")),
    );
}

test("data view toggle reveals advanced analytics and persists", async ({
  page,
}) => {
  await page.goto("/");

  const toggle = page.getByRole("group", { name: "Data view" });
  const simple = toggle.getByRole("button", { name: "Simple" });
  const advanced = toggle.getByRole("button", { name: "Advanced" });
  await expect(simple).toHaveAttribute("aria-pressed", "true");
  await expect(advanced).toHaveAttribute("aria-pressed", "false");
  expect(await visibleSections(page)).toEqual(["totals", "chart", "holdings"]);
  await expect(page.getByText("Return on cost")).toBeHidden();

  await advanced.click();

  await expect(advanced).toHaveAttribute("aria-pressed", "true");
  expect(await visibleSections(page)).toEqual([
    "totals",
    "performance",
    "chart",
    "breakdown",
    "holdings",
  ]);
  await expect(page.getByText("Return on cost")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Price freshness" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "By game" })).toBeVisible();
  await expect(
    page
      .locator('[data-dashboard-section="holdings"] .holding')
      .first()
      .getByText("Unit market"),
  ).toBeVisible();

  await page.reload();

  await expect(advanced).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute(
    "data-home-view",
    "advanced",
  );
  await expect(page.getByText("Return on cost")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("crdbrd.home-view.v1")),
  ).toBe("advanced");

  await simple.click();

  expect(await visibleSections(page)).toEqual(["totals", "chart", "holdings"]);
  expect(
    await page.evaluate(() => localStorage.getItem("crdbrd.home-view.v1")),
  ).toBe("simple");
});

test("advanced view stacks holding details on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("group", { name: "Data view" })
    .getByRole("button", { name: "Advanced" })
    .click();

  const details = page.locator(".holding-details").first();
  await expect(details).toBeVisible();
  await expect(details).toHaveCSS("display", "grid");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("market ticker scrolls priced movers that link to card detail", async ({
  page,
}) => {
  await page.goto("/");

  const ticker = page.getByRole("region", { name: "Market ticker" });
  await expect(ticker).toBeVisible();
  await expect(ticker.getByText(/Indicative · Jul 15/)).toBeVisible();

  const links = ticker.getByRole("link");
  await expect(links).toHaveCount(4);
  await expect(links.first()).toHaveAttribute("href", `/cards/${luffyId}`);
  await expect(links.first()).toHaveAccessibleName(
    /Monkey\.D\.Luffy.*up 4\.8%.*\$98.*observed Jul 15/,
  );
  await expect(ticker.getByText("RX-78-2 Gundam")).toHaveCount(0);
  expect(
    await ticker.locator('ul[aria-hidden="true"]').count(),
  ).toBeGreaterThan(0);
  await expect(ticker.locator(".ticker-track")).toHaveCSS(
    "animation-name",
    "ticker-scroll",
  );

  await links.first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/cards/${luffyId}$`));
});

test("market ticker is static under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const ticker = page.getByRole("region", { name: "Market ticker" });
  await expect(ticker.locator(".ticker-track")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(ticker.locator('ul[aria-hidden="true"]').first()).toBeHidden();
  await expect(ticker.locator(".ticker-viewport")).toHaveCSS(
    "overflow-x",
    "auto",
  );
  await expect(ticker.getByRole("link").first()).toBeVisible();
});

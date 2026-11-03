import { expect, test } from "@playwright/test";

const charizardId = "11111111-1111-4111-8111-111111111111";
const charizardPsa10VariantId = "11111111-1111-4111-8111-111111111113";

test("collector opens a card from search and reads its market stack", async ({
  page,
}) => {
  await page.goto("/search");
  await page.getByLabel("Card, set, or number").fill("Charizard");
  await page.getByRole("button", { name: "Search" }).click();

  await page.getByRole("link", { name: "Charizard", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cards/${charizardId}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Charizard" }),
  ).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "Market data views" });
  await expect(tablist.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Raw market")).toBeVisible();
  await expect(page.getByText("Top graded")).toBeVisible();

  await tablist.getByRole("tab", { name: /Graded/ }).click();
  const gradedPanel = page.getByRole("tabpanel");
  await expect(
    gradedPanel.getByRole("rowheader", { name: "PSA 10" }),
  ).toBeVisible();
  await expect(gradedPanel.getByText("Current")).toBeVisible();

  await tablist.getByRole("tab", { name: /Solds/ }).click();
  await expect(page.getByText(/Recent sales · not connected/)).toBeVisible();
});

test("tab strip supports keyboard navigation", async ({ page }) => {
  await page.goto(`/cards/${charizardId}`);
  const tablist = page.getByRole("tablist", { name: "Market data views" });
  await tablist.getByRole("tab", { name: /Overview/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tablist.getByRole("tab", { name: /Raw/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(tablist.getByRole("tab", { name: /Raw/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(tablist.getByRole("tab", { name: /Listings/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("collector adds a lot from the detail page and sees it in holdings", async ({
  page,
}) => {
  await page.goto(`/cards/${charizardId}`);
  const panel = page.getByRole("complementary", { name: "Add to portfolio" });
  await panel.getByLabel("Variant").selectOption(charizardPsa10VariantId);
  await panel.getByLabel("Quantity").fill("1");
  await panel.getByLabel("Total cost (USD)").fill("9000");
  await panel.getByRole("button", { name: "Add to portfolio" }).click();
  await expect(panel.getByText("Added to your portfolio.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("You own")).toBeVisible();
  await expect(
    page.locator(".owned-lots li").filter({ hasText: "PSA 10" }),
  ).toBeVisible();
});

test("unknown card ids return a not-found page", async ({ page }) => {
  const response = await page.goto(
    "/cards/99999999-9999-4999-8999-999999999999",
  );
  expect(response?.status()).toBe(404);
  const malformed = await page.goto("/cards/not-a-card");
  expect(malformed?.status()).toBe(404);
});

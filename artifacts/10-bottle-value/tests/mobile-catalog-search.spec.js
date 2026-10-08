import { expect, test } from "@playwright/test";

const catalogs = [
  {
    name: "international catalog",
    path: "/shop",
    sidebar: ".bpc-catalog-sidebar--worldwide",
    cards: '[id^="shop-product-"]',
  },
  {
    name: "US Warehouse",
    path: "/us-warehouse",
    sidebar: ".bpc-catalog-sidebar--us-warehouse",
    cards: '[id^="us-product-"]',
  },
];

async function prepareCatalog(page, catalog) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tbv-researcher-entry-accepted-v1",
      "accepted",
    );
  });
  await page.goto(catalog.path);
}

function getSearchInput(page, catalog) {
  return page.locator(`${catalog.sidebar} input[aria-label]`);
}

for (const catalog of catalogs) {
  test(`mobile ${catalog.name}: typing, filtering, and clearing do not wait for ratings`, async ({
    page,
  }) => {
    let releaseRatingRequest;
    let markRatingRequestStarted;
    const ratingRequestStarted = new Promise((resolve) => {
      markRatingRequestStarted = resolve;
    });
    const ratingRequestGate = new Promise((resolve) => {
      releaseRatingRequest = resolve;
    });

    await page.route("**/api/catalog-ranking", async (route) => {
      markRatingRequestStarted();
      await ratingRequestGate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ names: [], usNames: [] }),
      });
    });

    try {
      await prepareCatalog(page, catalog);
      await ratingRequestStarted;

      const search = getSearchInput(page, catalog);
      const cards = page.locator(catalog.cards);
      await expect(search).toBeVisible();
      await expect(cards.first()).toBeVisible();
      const initialCardCount = await cards.count();
      expect(initialCardCount).toBeGreaterThan(5);

      await page.evaluate((selector) => {
        const input = document.querySelector(selector);
        window.__mobileSearchFrames = [];
        input.addEventListener(
          "input",
          (event) => {
            const target = event.target;
            const valueAtInput = target.value;
            const startedAt = performance.now();
            requestAnimationFrame(() => {
              window.__mobileSearchFrames.push({
                valueAtInput,
                valueAtFrame: target.value,
                frameDelay: performance.now() - startedAt,
              });
            });
          },
          true,
        );
      }, `${catalog.sidebar} input[aria-label]`);

      await search.focus();
      let typedValue = "";
      for (const character of "BPC-157") {
        typedValue += character;
        await search.press(character);
        const frameIndex = typedValue.length - 1;
        await page.waitForFunction(
          (index) => window.__mobileSearchFrames.length > index,
          frameIndex,
        );
        const frame = await page.evaluate(
          (index) => window.__mobileSearchFrames[index],
          frameIndex,
        );
        expect(frame.valueAtInput).toBe(typedValue);
        expect(frame.valueAtFrame).toBe(typedValue);
        expect(frame.frameDelay).toBeLessThan(100);
      }

      await expect(search).toHaveValue("BPC-157");
      await expect
        .poll(() => cards.count(), { timeout: 2_000 })
        .toBeLessThan(initialCardCount);
      const filteredCardCount = await cards.count();
      expect(filteredCardCount).toBeGreaterThan(0);

      await page.getByRole("button", { name: "Clear search", exact: true }).click();
      await expect(search).toHaveValue("");
      await expect(cards).toHaveCount(initialCardCount);
    } finally {
      releaseRatingRequest();
    }
  });

  test(`mobile ${catalog.name}: cards and search remain available when ratings fail`, async ({
    page,
  }) => {
    await page.route("**/api/catalog-ranking", (route) => route.abort("failed"));
    const ratingRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/api/catalog-ranking",
    );

    await prepareCatalog(page, catalog);
    await ratingRequest;

    const search = getSearchInput(page, catalog);
    const cards = page.locator(catalog.cards);
    await expect(cards.first()).toBeVisible();
    const initialCardCount = await cards.count();
    expect(initialCardCount).toBeGreaterThan(5);

    await search.fill("BPC-157");
    await expect(search).toHaveValue("BPC-157");
    await expect
      .poll(() => cards.count(), { timeout: 2_000 })
      .toBeLessThan(initialCardCount);
    expect(await cards.count()).toBeGreaterThan(0);
  });
}

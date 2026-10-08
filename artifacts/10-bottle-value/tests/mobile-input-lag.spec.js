import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORT_INPUT_DELAY_MS = 60;

async function acceptResearcherEntry(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tbv-researcher-entry-accepted-v1",
      "accepted",
    );
  });
}

async function measureTypingFrames(page, selector, text) {
  await page.evaluate((inputSelector) => {
    const input = document.querySelector(inputSelector);
    if (!input) throw new Error(`Input not found: ${inputSelector}`);

    window.__mobileInputFrames = [];
    input.addEventListener(
      "input",
      (event) => {
        const target = event.target;
        const valueAtInput = target.value;
        const startedAt = performance.now();
        requestAnimationFrame(() => {
          window.__mobileInputFrames.push({
            valueAtInput,
            valueAtFrame: target.value,
            frameDelay: performance.now() - startedAt,
          });
        });
      },
      true,
    );
  }, selector);

  const frames = [];
  let typedValue = "";
  for (const character of text) {
    typedValue += character;
    await page.locator(selector).press(character);
    const frameIndex = frames.length;
    await page.waitForFunction(
      (index) => window.__mobileInputFrames.length > index,
      frameIndex,
    );
    const frame = await page.evaluate(
      (index) => window.__mobileInputFrames[index],
      frameIndex,
    );
    expect(frame.valueAtInput).toBe(typedValue);
    expect(frame.valueAtFrame).toBe(typedValue);
    expect(frame.frameDelay).toBeLessThan(100);
    frames.push(frame);
  }

  const averageDelay =
    frames.reduce((sum, frame) => sum + frame.frameDelay, 0) / frames.length;
  expect(averageDelay).toBeLessThan(MOBILE_VIEWPORT_INPUT_DELAY_MS);
  return frames;
}

test("mobile FAQ search stays responsive while the question list filters", async ({
  page,
}) => {
  await acceptResearcherEntry(page);
  await page.goto("/faq");

  const search = page.locator('input[type="search"]');
  await expect(search).toBeVisible();
  await search.focus();
  await measureTypingFrames(page, 'input[type="search"]', "shipping");
  await expect(search).toHaveValue("shipping");

  await search.fill("no-such-faq-match");
  await expect(page.getByRole("status")).toBeVisible();
});

test("mobile account fields stay responsive and submit the latest draft", async ({
  page,
}) => {
  let submittedCredentials = null;
  await page.route(
    (url) =>
      url.pathname.endsWith("/auth/v1/token") &&
      url.searchParams.get("grant_type") === "password",
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "authorization, apikey, content-type, x-client-info",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
        return;
      }

      submittedCredentials = route.request().postDataJSON();
      await route.fulfill({
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      });
    },
  );

  await acceptResearcherEntry(page);
  await page.goto("/account");

  const email = page.locator('form input[type="email"]:visible').first();
  const password = page.locator('form input[type="password"]:visible').first();
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  await email.focus();
  await measureTypingFrames(page, 'form input[type="email"]', "typingfast");
  await email.fill("typing@example.test");
  await password.fill("not-a-real-password");
  await password.press("Enter");

  await expect.poll(() => submittedCredentials).not.toBeNull();
  expect(submittedCredentials).toMatchObject({
    email: "typing@example.test",
    password: "not-a-real-password",
  });
});

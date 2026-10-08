import { defineConfig } from "@playwright/test";

const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/repl/tools/bin/chromium";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/mobile-*.spec.js",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: "list",
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4179",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    launchOptions: {
      executablePath: chromiumPath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  webServer: {
    command: "PORT=4179 BASE_PATH=/ pnpm run dev",
    url: "http://127.0.0.1:4179/shop",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

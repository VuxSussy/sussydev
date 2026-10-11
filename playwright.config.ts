import { defineConfig } from "@playwright/test";

/**
 * Browser regression tests (e2e/) on the locally installed Chrome.
 * Set E2E_BASE_URL to reuse a running server (vinext allows one dev server per folder); otherwise one is started.
 */
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: external ?? "http://localhost:3100", channel: "chrome", headless: true, viewport: { width: 1440, height: 900 } },
  webServer: external ? undefined : { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop" },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
});

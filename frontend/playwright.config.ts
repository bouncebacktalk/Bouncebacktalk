import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * On NixOS, Playwright's own downloaded browsers don't run (FHS assumptions),
 * so the VM provides chromium via the `playwright-driver.browsers-chromium` nix
 * package exposed as PLAYWRIGHT_BROWSERS_PATH (see nixos/modules/playwright.nix).
 * We launch that exact binary, which is resilient to revision drift and the
 * chrome-linux / chrome-linux64 layout difference between Playwright versions.
 *
 * Off NixOS (your laptop / CI), this returns undefined and Playwright uses its
 * own browser from `pnpm exec playwright install chromium`.
 */
function nixChromium(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  for (const dir of readdirSync(root)) {
    if (!dir.startsWith("chromium-")) continue;
    for (const layout of ["chrome-linux", "chrome-linux64"]) {
      const bin = join(root, dir, layout, "chrome");
      if (existsSync(bin)) return bin;
    }
  }
  return undefined;
}

// The running app. In a PlayCode project the services run via systemd behind
// Traefik on the app port; locally, point this at your dev server
// (E2E_BASE_URL=http://localhost:3010 pnpm test:e2e).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: nixChromium() },
      },
    },
  ],
});

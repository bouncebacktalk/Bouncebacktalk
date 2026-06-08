import { expect, test } from "@playwright/test";

/**
 * Example end-to-end test. Real browser, real server - this is the tool to
 * reach for when a bug only shows up once HTML, CSS, and JS run together
 * (hydration, client-side routing, focus traps, a button that does nothing).
 *
 * Run it against a live app:
 *     pnpm test:e2e                                  # in-VM, hits Traefik :3000
 *     E2E_BASE_URL=http://localhost:3010 pnpm test:e2e   # against `pnpm dev`
 *
 * Add a `*.spec.ts` here per surface you want covered. Keep assertions on what
 * the user sees and does, not on implementation details. See docs/07 for the
 * NixOS browser story and `pnpm test:e2e:headed` / `:ui` for debugging.
 */
test.describe("landing", () => {
  test("renders the hero and the contact form", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Launch your product/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send message/i }),
    ).toBeVisible();
  });

  test("hydrates without uncaught client-side exceptions", async ({ page }) => {
    // A hydration crash (e.g. the layout reading a property of an undefined
    // pageContext field) leaves the SSR'd HTML on screen, so content assertions
    // still pass - but it throws here and breaks interactivity. `pageerror`
    // catches uncaught exceptions; network failures (a 401 from /api) do not
    // count, so this stays meaningful without a backend.
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(
      pageErrors,
      `uncaught exception(s) during load/hydration:\n${pageErrors.join("\n")}`,
    ).toEqual([]);
  });

  test("has no horizontal overflow on a phone viewport", async ({ page }) => {
    // The framed header/landing must fit narrow screens; horizontal overflow
    // makes the whole page (sticky header included) drift sideways on scroll.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, "page overflows horizontally on a 375px viewport").toBe(0);
  });

  test("navigates to sign-in via the client router, without a full reload", async ({
    page,
  }) => {
    await page.goto("/");
    // Let Vike hydrate so it can intercept the link click. Until hydration the
    // anchor is a plain navigation; after it, clicks route client-side.
    await page.waitForLoadState("networkidle");

    // Drop a marker on the live page object. A full document reload wipes it; a
    // client-side route transition preserves it. This is exactly how you'd
    // confirm "is this really SPA navigation or a disguised href reload?".
    await page.evaluate(() => {
      (window as unknown as { __noReload?: boolean }).__noReload = true;
    });

    await page.locator("header").getByRole("link", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/i }),
    ).toBeVisible();

    const survived = await page.evaluate(
      () => (window as unknown as { __noReload?: boolean }).__noReload === true,
    );
    expect(
      survived,
      "page reloaded instead of routing client-side - the link is doing a full navigation, not Vike client routing",
    ).toBe(true);
  });
});

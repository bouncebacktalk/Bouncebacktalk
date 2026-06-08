import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Page } from "./+Page";

/**
 * Smoke test for the index (landing) page. Add a `+Page.test.tsx` next to each
 * `+Page.tsx` to verify content + behavior. Vitest auto-discovers via
 * `{pages,apps,...}/**\/*.{test,spec}.{ts,tsx}` (see vitest.config.ts).
 *
 * The landing resolves the session on mount, but these assertions check the
 * initial signed-out render, which is deterministic regardless of that fetch.
 */
describe("IndexPage", () => {
  it("renders the project wordmark", () => {
    render(<Page />);
    expect(screen.getAllByText(/{{PROJECT_TITLE}}/).length).toBeGreaterThan(0);
  });

  it("renders signed-out auth actions", () => {
    render(<Page />);
    expect(screen.getAllByText(/Sign in/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Get started/).length).toBeGreaterThan(0);
  });

  it("renders the default contact form", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 2, name: /See the stack work/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Send message/ })).toBeTruthy();
  });
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest config for the frontend. Separate from `vite.config.ts` because
 * the dev server config (Vike plugin, port, allowedHosts) doesn't apply
 * to test runs and would slow things down. React + jsdom is enough.
 */
export default defineConfig({
  plugins: [react()],
  // Mirror the `@/*` alias from vite.config.ts so tests resolve shadcn imports.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["{pages,apps,renderer,server}/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["{pages,apps,renderer}/**/*.{ts,tsx}"],
      exclude: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/+config.ts",
        "**/+onRender*.tsx",
      ],
    },
  },
});

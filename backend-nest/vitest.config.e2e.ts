import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    fileParallelism: false,
    hookTimeout: 15_000,
    testTimeout: 15_000,
  },
  esbuild: {
    target: "es2022",
  },
});

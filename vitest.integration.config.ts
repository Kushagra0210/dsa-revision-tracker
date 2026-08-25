import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.int.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});

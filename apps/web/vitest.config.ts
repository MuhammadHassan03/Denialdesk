import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Tests run server code outside Next.js, where "server-only" would throw.
      "server-only": fileURLToPath(new URL("./vitest.server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Placeholder settings so server modules load. The pool never connects in unit tests.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/unused",
      PIPELINE_URL: "http://localhost:8000",
      APP_URL: "http://localhost:3000",
      STORAGE_DIR: "unused",
      FILE_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
  },
});

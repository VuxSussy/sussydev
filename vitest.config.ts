import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests do not need Vinext's server or Cloudflare runtime.
export default defineConfig({
  resolve: { alias: {
    "@": fileURLToPath(new URL(".", import.meta.url)),
    next: fileURLToPath(new URL("./node_modules/vinext/dist/shims", import.meta.url)),
  } },
  test: { environment: "node", include: ["tests/**/*.test.{ts,tsx}"] },
});

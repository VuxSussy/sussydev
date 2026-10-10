import { defineConfig } from "vitest/config";

// Unit tests do not need Vinext's server or Cloudflare runtime.
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"] } });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Client-side rendering only. The library reads configuration from process.env, which Vite does not define;
// this is the setup documented in the README.
export default defineConfig({
  plugins: [react()],
  // e2e fallback test: served as http://insecure.test (not a secure context, so no Web Crypto)
  preview: { allowedHosts: ["insecure.test"] },
  build: { rollupOptions: { input: ["index.html", "bench.html"] } },
  define: {
    "process.env": { VITE_SECURE_LOCAL_STORAGE_PREFIX: "vite-e2e" },
  },
});

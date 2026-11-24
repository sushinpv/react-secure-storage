import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Client-side rendering only. The library reads configuration from process.env, which Vite does not define;
// this is the setup documented in the README.
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": { VITE_SECURE_LOCAL_STORAGE_PREFIX: "vite-e2e" },
  },
});

import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// No `process.env` define: this fixture checks the library falls back to defaults when `process` is undefined in the browser.
export default defineConfig({
  plugins: [reactRouter()],
});

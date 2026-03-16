import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBase(basePath?: string) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  return `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
}

// https://vite.dev/config/
export default defineConfig({
  base: normalizeBase(process.env.DEPLOY_BASE),
  plugins: [react()],
});

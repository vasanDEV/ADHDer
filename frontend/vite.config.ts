import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The desktop shell (Tauri/WebView2) and the browser dev workflow both load the
// same frontend. During development the backend runs on port 8756 and API calls
// are proxied through Vite so the app can use same-origin "/api" requests.
const BACKEND_URL = process.env.ADHDER_BACKEND_URL ?? "http://127.0.0.1:8756";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: BACKEND_URL, changeOrigin: true },
      "/health": { target: BACKEND_URL, changeOrigin: true },
    },
  },
});

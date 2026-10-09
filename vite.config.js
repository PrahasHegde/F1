import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/openf1": {
        target: "https://api.openf1.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openf1/, ""),
      },
    },
  },
  preview: {
    proxy: {
      "/openf1": {
        target: "https://api.openf1.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openf1/, ""),
      },
    },
  },
});

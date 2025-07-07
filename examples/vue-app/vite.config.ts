import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      zenon: path.resolve(__dirname, "../../src"),
      "zenon/plugins": path.resolve(__dirname, "../../src/plugins"),
      "zenon/utils/compose": path.resolve(__dirname, "../../src/utils/compose"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

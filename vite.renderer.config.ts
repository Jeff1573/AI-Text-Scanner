import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config
export default defineConfig({
  // 使用相对基础路径，确保打包后通过 file:// 协议加载时资源路径正确
  base: "./",
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  root: resolve(__dirname, "renderer"),
  build: {
    outDir: resolve(__dirname, ".vite/renderer"),
    emptyOutDir: true,
  },
});

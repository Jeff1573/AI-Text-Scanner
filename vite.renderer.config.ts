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
    // 优化打包
    minify: 'esbuild', // 使用 esbuild 更快且兼容性更好
    rollupOptions: {
      // 启用 tree-shaking
      treeshake: {
        moduleSideEffects: false
      },
      output: {
        // 优化的代码分割和 tree-shaking
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('antd')) {
              return 'antd-vendor';
            }
            if (id.includes('@ant-design/icons')) {
              return 'icons-vendor';
            }
            if (id.includes('ai-sdk') || id.includes('ai')) {
              return 'ai-vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    // 设置更合理的 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000
  }
});

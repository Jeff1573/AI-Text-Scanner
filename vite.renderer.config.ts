import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config
export default defineConfig({
  // 使用相对基础路径，确保打包后通过 file:// 协议加载时资源路径正确
  base: "./",
  plugins: [react()],
  root: resolve(__dirname, "renderer"),
  optimizeDeps: {
    // 强制预构建这些依赖，避免版本检测问题
    include: [
      'react', 
      'react-dom', 
      'antd', 
      '@ant-design/icons',
      'react-router-dom',
      'zustand'
    ],
    // 排除可能导致问题的依赖
    exclude: [],
    // 强制重新预构建
    force: true
  },
  build: {
    outDir: resolve(__dirname, ".vite/renderer"),
    emptyOutDir: true,
    // 简化构建配置
    minify: 'esbuild',
    // 添加sourcemap以便调试
    sourcemap: true,
    rollupOptions: {
      output: {
        // 暂时禁用代码分割来测试
        manualChunks: {
          // 将React相关库打包到一起
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将Ant Design相关库打包到一起
          'antd-vendor': ['antd', '@ant-design/icons'],
          // 将AI SDK相关库打包到一起
          'ai-vendor': ['ai', '@ai-sdk/anthropic', '@ai-sdk/google', '@ai-sdk/openai', '@ai-sdk/openai-compatible'],
          // 其他第三方库
          'vendor': ['zustand', 'electron-log', 'winston']
        }
      }
    }
  }
});

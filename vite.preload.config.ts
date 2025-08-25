import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'main'),
    },
  },
  build: {
    // 库模式，用于预加载脚本
    lib: {
      entry: resolve(__dirname, 'main/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    outDir: resolve(__dirname, '.vite/build'),
    emptyOutDir: false, // 不清空目录，因为主进程已经构建过
    rollupOptions: {
      // 预加载脚本需要排除的依赖
      external: [
        'electron'
      ],
    },
  },
});

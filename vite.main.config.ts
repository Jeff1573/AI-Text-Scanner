import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // 确保静态资源被复制到构建目录
      external: [],
    },
    // 复制静态资源
    copyPublicDir: false,
  },
  // 手动处理静态资源
  plugins: [
    {
      name: 'copy-static-assets',
      generateBundle() {
        // 在构建时复制静态资源
        this.emitFile({
          type: 'asset',
          fileName: 'static/tray-icon.svg',
          source: readFileSync(resolve(__dirname, 'main/static/tray-icon.svg'))
        });
      }
    }
  ]
});

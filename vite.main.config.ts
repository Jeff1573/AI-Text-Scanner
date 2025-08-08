import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';

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
        // 复制目录下的所有文件到static
        const staticDir = resolve(__dirname, 'main/static');
        const files = readdirSync(staticDir);
        for (const file of files) {
          this.emitFile({
            type: 'asset',
            fileName: `static/${file}`,
            source: readFileSync(resolve(staticDir, file))
          });
        }
      }
    }
  ]
});

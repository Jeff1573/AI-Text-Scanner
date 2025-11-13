import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync, readFileSync } from "fs";
import { builtinModules } from "module";

// 开发服务器URL配置
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// https://vitejs.dev/config
export default defineConfig(({ mode }) => ({
  // 定义环境变量
  define: {
    'process.env.VITE_DEV_SERVER_URL': JSON.stringify(VITE_DEV_SERVER_URL),
    'process.env.NODE_ENV': JSON.stringify(mode)
  },
  resolve: {
    // 一些第三方库可能使用 Node.js 模块，需要设置别名
    alias: {
      "@": resolve(__dirname, "main"),
    },
  },
  build: {
    // 库模式，用于主进程
    lib: {
      entry: resolve(__dirname, "main/main.ts"),
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    outDir: resolve(__dirname, ".vite/build"),
    emptyOutDir: true,
    rollupOptions: {
      // 主进程需要排除的依赖（这些依赖将在运行时从 node_modules 加载）
      external: [
        "electron",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
    // 复制静态资源
    copyPublicDir: false,
  },
  // 手动处理静态资源
  plugins: [
    {
      name: "copy-static-assets",
      generateBundle() {
        // 在构建时复制静态资源
        try {
          const staticDir = resolve(__dirname, "main/static");
          const files = readdirSync(staticDir);
          for (const file of files) {
            this.emitFile({
              type: "asset",
              fileName: `static/${file}`,
              source: readFileSync(resolve(staticDir, file)),
            });
          }
        } catch (error) {
          console.warn("Static assets directory not found:", error.message);
        }
      },
    },
  ],
}));

// 将开发服务器URL导出，以便在其他配置文件中使用
export { VITE_DEV_SERVER_URL };

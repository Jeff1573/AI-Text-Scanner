# Electron应用打包路径问题修复总结

## 问题概述

**项目类型：** Electron应用（基于Electron Forge + Vite）  
**打包工具：** Electron Forge + Vite插件  
**问题表现：** 静态资源（如托盘图标）在打包后找不到，导致应用启动失败

## 问题分析

### 根本原因
1. **静态资源未被包含在构建过程中**：`main/static/tray-icon.svg` 文件没有被Vite构建过程包含
2. **硬编码路径问题**：在main.js中使用了硬编码的相对路径 `./static/tray-icon.svg`
3. **构建配置不完整**：Electron Forge的Vite插件配置没有处理静态资源复制

### 具体表现
- 构建后的应用目录中缺少 `static` 目录和相关文件
- 应用启动时无法找到托盘图标文件
- 渲染进程路径在生产环境中不正确

## 解决方案

### 1. 修改Vite主进程配置

**文件：** `vite.main.config.ts`

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [],
    },
    copyPublicDir: false,
  },
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
```

**关键点：**
- 使用自定义Vite插件在构建时复制静态资源
- 通过 `emitFile` API 将静态文件包含到构建输出中
- 保持原有的目录结构 `static/tray-icon.svg`

### 2. 修改主进程中的路径解析逻辑

**文件：** `main/main.ts`

```typescript
// 在开发环境和生产环境中使用不同的路径解析策略
let iconPath: string;
if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  // 开发环境：直接使用源码目录
  iconPath = path.join(__dirname, "../main/static/tray-icon.svg");
} else {
  // 生产环境：使用构建后的路径
  iconPath = path.join(__dirname, "./static/tray-icon.svg");
}

console.log("iconPath", iconPath);
console.log("iconPath exists:", fs.existsSync(iconPath));

const icon = nativeImage.createFromPath(iconPath);
```

**关键点：**
- 根据环境变量 `MAIN_WINDOW_VITE_DEV_SERVER_URL` 判断开发/生产环境
- 开发环境使用源码目录路径
- 生产环境使用构建后的相对路径
- 添加路径存在性检查用于调试

### 3. 修正渲染进程路径

**文件：** `main/main.ts`

```typescript
// 修正主窗口加载路径
if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
} else {
  mainWindow.loadFile(
    path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
  );
}
```

**关键点：**
- 使用 `MAIN_WINDOW_VITE_NAME` 变量确保路径正确
- 保持与Electron Forge Vite插件的路径约定一致

## 验证结果

### 构建后的文件结构
```
out/ai-ocr-win32-x64/resources/app/
├── .vite/
│   ├── build/
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── static/
│   │       └── tray-icon.svg  ✓ 静态资源已正确复制
│   └── renderer/
│       ├── index.html
│       ├── assets/
│       └── vite.svg
└── package.json
```

### 功能验证
- ✅ 静态资源正确复制到构建目录
- ✅ 托盘图标路径解析正确
- ✅ 应用可以正常启动
- ✅ 开发环境和生产环境路径都正确

## 最佳实践

### 1. 静态资源管理
- 使用Vite插件系统处理静态资源复制
- 避免硬编码路径，使用环境变量判断
- 在构建配置中明确处理所有静态资源

### 2. 路径解析策略
- 区分开发环境和生产环境的路径解析
- 使用 `path.join()` 确保跨平台兼容性
- 添加路径存在性检查便于调试

### 3. 构建配置
- 保持与Electron Forge约定的目录结构一致
- 使用官方推荐的Vite插件配置
- 确保所有必要的资源都被包含在构建输出中

## 相关技术栈

- **Electron**: 37.2.4
- **Electron Forge**: ^7.8.2
- **Vite**: ^5.4.19
- **构建目标**: Windows x64

## 总结

通过修改Vite配置添加静态资源复制插件，以及在主进程中实现环境感知的路径解析，成功解决了Electron应用打包后的路径问题。这种解决方案既保证了开发环境的便利性，又确保了生产环境的正确性。

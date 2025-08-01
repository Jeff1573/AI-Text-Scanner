# Fast OCR - 屏幕截图工具

一个基于 Electron 的桌面应用程序，提供简单高效的屏幕截图和区域选择功能。

## 功能特性

- 🖥️ **一键截图** - 快速获取屏幕截图
- 🎯 **区域选择** - 拖拽选择任意区域
- 🖼️ **图片管理** - 显示选中图片和尺寸信息
- 🎨 **现代化界面** - 简洁美观的用户界面

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速构建工具

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm start
```

### 构建应用

```bash
# 打包应用
npm run package

# 制作安装包
npm run make
```

## 使用说明

1. **截图** - 点击"获取屏幕截图"按钮
2. **选择区域** - 在截图窗口中拖拽选择区域
3. **查看结果** - 选中的图片会显示在主界面中

## 项目结构

```
fast-ocr/
├── main/                 # 主进程代码
├── renderer/             # 渲染进程代码
│   └── src/
│       ├── components/   # React 组件
│       ├── hooks/        # 自定义 Hooks
│       ├── pages/        # 页面组件
│       └── types/        # 类型定义
└── package.json
```

## 许可证

MIT License 
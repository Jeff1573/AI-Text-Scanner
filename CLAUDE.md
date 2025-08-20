# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Electron 和 React 的 AI 文字识别应用，名为 AI Text Scanner。主要功能包括：
- 屏幕截图文字识别
- 多语言文本翻译
- 可配置的 AI API 设置（支持 OpenAI API）
- 现代化的用户界面（使用 Ant Design）
- 全局快捷键支持

## 技术栈

- 前端: React 19, TypeScript, Vite
- 桌面应用: Electron 37
- UI组件: Ant Design
- AI服务: OpenAI API
- 路由: React Router DOM

## 项目结构

```
ai-text-scanner/
├── main/                 # Electron主进程
├── renderer/             # 渲染进程(React应用)
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── hooks/        # 自定义Hooks
│   │   ├── pages/        # 页面组件
│   │   ├── routes/       # 路由配置
│   │   └── utils/        # 工具函数
│   └── public/           # 静态资源
└── figma/               # Figma设计文件
```

## 开发命令

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

### 构建应用
```bash
npm run make
```

### 代码检查
```bash
npm run lint
```

## 核心架构说明

### Electron 主进程 (main/)
- `main.ts`: 应用入口文件，负责创建窗口、管理全局快捷键、系统托盘等
- `utils/openaiService.ts`: 封装 OpenAI API 调用逻辑
- `preload.ts`: 预加载脚本，用于主进程与渲染进程间的安全通信

### React 渲染进程 (renderer/)
- 使用 React Router DOM 进行路由管理
- 主要页面：
  - HomePage: 主界面，包含截图和翻译功能入口
  - SettingsPage: 设置页面，配置 API 和快捷键
  - ResultPage: 翻译结果显示页面
  - ScreenshotViewer: 截图展示和区域选择页面
- 自定义 Hooks 管理状态逻辑
- 通过 Electron IPC 与主进程通信

### 数据流
1. 用户通过快捷键或界面操作触发功能
2. 渲染进程通过 `window.electronAPI` 调用主进程功能
3. 主进程处理业务逻辑（如调用 OpenAI API）
4. 结果通过 IPC 返回渲染进程显示

### 配置管理
- 应用配置保存在用户数据目录的 `config.json` 文件中
- 支持 OpenAI API 配置、翻译语言设置、快捷键自定义等

## 常见开发任务

### 添加新功能
1. 在主进程添加相应的 IPC 处理器
2. 在渲染进程创建对应的组件或页面
3. 通过 `window.electronAPI` 进行进程间通信

### 修改快捷键
- 快捷键在 `SettingsPage` 中配置
- 主进程通过 `registerGlobalShortcuts` 函数注册全局快捷键
- 系统托盘菜单会根据配置动态更新

### 更新 UI 组件
- 组件位于 `renderer/src/components/`
- 遵循 Ant Design 组件库的使用规范
- 使用自定义 Hooks 管理组件状态
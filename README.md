# Fast OCR - AI文字识别应用

一个基于Electron和React的AI文字识别应用，支持截图识别和文本翻译功能。

## 功能特性

- 🖼️ 屏幕截图文字识别
- 🌐 多语言文本翻译
- ⚙️ 可配置的AI API设置
- 🎨 现代化的用户界面
- ⌨️ 全局快捷键支持

## 全局快捷键

应用支持以下全局快捷键：

- **Ctrl+Shift+R** (Windows/Linux) 或 **Cmd+Shift+R** (macOS): 快速打开结果页面

### 使用方法

1. 启动应用后，全局快捷键会自动注册
2. 在任何时候按下快捷键组合即可快速打开ResultPage界面
3. 即使应用窗口最小化，快捷键仍然有效

## 开发环境设置

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

## 技术栈

- **前端**: React 19, TypeScript, Vite
- **桌面应用**: Electron 37
- **UI组件**: Ant Design
- **AI服务**: OpenAI API
- **路由**: React Router DOM

## 项目结构

```
fast-ocr/
├── main/                 # Electron主进程
├── renderer/            # 渲染进程(React应用)
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── hooks/       # 自定义Hooks
│   │   ├── pages/       # 页面组件
│   │   ├── routes/      # 路由配置
│   │   └── utils/       # 工具函数
│   └── public/          # 静态资源
└── figma/              # Figma设计文件
```

## 配置说明

应用支持自定义OpenAI API配置：

1. 打开设置页面
2. 输入你的OpenAI API密钥和端点URL
3. 选择适合的模型
4. 保存配置

## 许可证

MIT License 
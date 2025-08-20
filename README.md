# AI Text Scanner

基于 Electron 和 React 的 AI 智能文本扫描应用，支持截图识别和文本翻译。

## 功能特性

- 🖼️ **屏幕截图识别** - 快速截图并提取文字内容
- 🌐 **文本翻译** - 支持多语言文本翻译
- ⚙️ **AI API 配置** - 支持自定义 OpenAI API 设置
- ⌨️ **全局快捷键** - 系统级快捷键支持
- 🔧 **系统托盘** - 最小化到系统托盘运行
- 🚀 **开机自启** - 可选的开机自动启动

## 快捷键

- **Ctrl+Shift+S** (Windows/Linux) 或 **Cmd+Shift+S** (macOS): 截图识别
- **Ctrl+Shift+T** (Windows/Linux) 或 **Cmd+Shift+T** (macOS): 快捷翻译

## 开发

### 安装依赖
```bash
npm install
```

### 启动开发
```bash
npm start
```

### 构建应用
```bash
npm run make
```

## 配置

在设置页面配置 OpenAI API：
1. 输入 API 密钥和端点 URL
2. 选择合适的模型
3. 保存配置

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **桌面**: Electron 37
- **UI**: Ant Design
- **AI**: OpenAI API

## 许可证

MIT License
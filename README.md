# Fast OCR - 屏幕截图工具

这是一个基于Electron的桌面应用程序，提供了强大的屏幕截图功能。

## 功能特性

### 🖥️ 屏幕截图
- 获取所有可用屏幕的缩略图
- 支持多显示器环境
- 高质量截图保存
- 实时预览功能

### 🎨 现代化界面
- 响应式设计
- 美观的用户界面
- 流畅的动画效果
- 直观的操作体验

## 技术实现

### 核心技术栈
- **Electron 37.2.4** - 跨平台桌面应用框架
- **React 19.1.0** - 用户界面库
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速构建工具

### 屏幕截图实现

#### 1. 主进程配置 (`main/main.ts`)
```typescript
// 设置桌面捕获权限处理
session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
  desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
    callback({ video: sources[0] });
  });
}, { useSystemPicker: true });

// 处理屏幕截图请求
ipcMain.handle('capture-screen', async () => {
  const sources = await desktopCapturer.getSources({ 
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  // 返回屏幕信息
});
```

#### 2. 预加载脚本 (`main/preload.ts`)
```typescript
// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: (options = {}) => ipcRenderer.invoke('capture-screen', options)
});
```

#### 3. 渲染进程界面 (`renderer/src/App.tsx`)
```typescript
// 获取屏幕截图
const handleCaptureScreen = async () => {
  const result = await window.electronAPI.captureScreen();
  setCaptureResult(result);
};
```

## 安装和运行

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

### 屏幕截图
1. 点击"获取屏幕截图"按钮
2. 系统将显示所有可用屏幕的缩略图
3. 点击选择要查看的屏幕
4. 点击"保存截图"将图片保存到本地

## 安全特性

- **上下文隔离**: 使用`contextIsolation: true`确保渲染进程安全
- **权限控制**: 通过`setDisplayMediaRequestHandler`控制屏幕访问权限
- **API限制**: 只暴露必要的API给渲染进程

## 开发指南

### 项目结构
```
fast-ocr/
├── main/                 # 主进程代码
│   ├── main.ts          # 主进程入口
│   └── preload.ts       # 预加载脚本
├── renderer/             # 渲染进程代码
│   └── src/
│       ├── App.tsx      # 主界面组件
│       └── App.css      # 样式文件
└── package.json         # 项目配置
```

### 添加新功能
1. 在主进程中实现核心逻辑
2. 在预加载脚本中暴露API
3. 在渲染进程中创建用户界面
4. 添加相应的样式和类型定义

## 故障排除

### 常见问题

**Q: 无法获取屏幕截图**
A: 确保应用有屏幕录制权限，在系统偏好设置中允许应用访问屏幕。

**Q: 应用启动失败**
A: 检查Node.js版本，确保所有依赖正确安装。

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

---

基于Electron最新文档实现，支持Windows、macOS和Linux平台。 
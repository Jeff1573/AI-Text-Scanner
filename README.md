# Fast OCR - 屏幕截图工具

这是一个基于Electron的桌面应用程序，提供了简单高效的屏幕截图功能。

## 功能特性

### 🖥️ 屏幕截图
- 一键获取屏幕截图
- 自动在新窗口中全屏显示
- **智能窗口隐藏**: 截图时自动隐藏应用窗口，确保截图内容纯净
- **即时展示**: 获取截图后立即在新窗口中展示

### 🎨 现代化界面
- 简洁的用户界面
- 一键操作设计
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

// 处理屏幕截图请求 - 包含窗口隐藏逻辑
ipcMain.handle('capture-screen', async () => {
  // 隐藏当前应用窗口
  if (mainWindow) {
    mainWindow.hide();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const sources = await desktopCapturer.getSources({ 
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  
  // 截图完成后恢复窗口显示
  if (mainWindow) {
    mainWindow.show();
  }
  
  return { success: true, sources };
});

// 创建全屏截图展示窗口
ipcMain.handle('create-screenshot-window', async (event, screenshotData) => {
  const screenshotWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: { contextIsolation: true }
  });
  
  screenshotWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`);
  screenshotWindow.webContents.send('screenshot-data', screenshotData);
});
```

#### 2. 预加载脚本 (`main/preload.ts`)
```typescript
// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: (options = {}) => ipcRenderer.invoke('capture-screen', options),
  createScreenshotWindow: (data) => ipcRenderer.invoke('create-screenshot-window', data),
  onScreenshotData: (callback) => ipcRenderer.on('screenshot-data', callback)
});
```

#### 3. 渲染进程界面 (`renderer/src/App.tsx`)
```typescript
// 一键截图并显示
const handleCaptureScreen = async () => {
  const result = await window.electronAPI.captureScreen();
  
  if (result.success && result.sources && result.sources.length > 0) {
    // 直接使用第一个屏幕的截图创建新窗口
    const firstSource = result.sources[0];
    await window.electronAPI.createScreenshotWindow(firstSource);
  }
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
2. 应用窗口会自动隐藏，确保截图内容纯净
3. 系统自动获取第一个可用屏幕的截图
4. 新窗口自动打开并全屏显示截图内容
5. 应用窗口会自动恢复显示

### 全屏展示功能
- 新窗口会自动全屏显示截图内容
- 窗口顶部有标题栏和关闭按钮
- 点击关闭按钮或按ESC键可以关闭全屏窗口

## 安全特性

- **上下文隔离**: 使用`contextIsolation: true`确保渲染进程安全
- **权限控制**: 通过`setDisplayMediaRequestHandler`控制屏幕访问权限
- **API限制**: 只暴露必要的API给渲染进程
- **窗口管理**: 智能隐藏/显示窗口，确保截图质量
- **多窗口支持**: 安全的多窗口通信机制

## 开发指南

### 项目结构
```
fast-ocr/
├── main/                 # 主进程代码
│   ├── main.ts          # 主进程入口
│   └── preload.ts       # 预加载脚本
├── renderer/             # 渲染进程代码
│   └── src/
│       ├── App.tsx      # 主界面组件（包含路由）
│       └── App.css      # 样式文件
└── package.json         # 项目配置
```

### 组件架构
- **MainApp**: 主应用界面，包含一键截图功能
- **ScreenshotViewer**: 全屏截图展示组件
- **App**: 路由组件，根据URL hash切换组件

### 添加新功能
1. 在主进程中实现核心逻辑
2. 在预加载脚本中暴露API
3. 在渲染进程中创建用户界面
4. 添加相应的样式和类型定义

## 故障排除

### 常见问题

**Q: 无法获取屏幕截图**
A: 确保应用有屏幕录制权限，在系统偏好设置中允许应用访问屏幕。

**Q: 截图时窗口没有隐藏**
A: 检查应用是否有窗口管理权限，某些系统可能需要额外权限。

**Q: 全屏窗口无法显示**
A: 检查是否有其他应用占用全屏模式，确保系统支持多窗口。

**Q: 应用启动失败**
A: 检查Node.js版本，确保所有依赖正确安装。

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

---

基于Electron最新文档实现，支持Windows、macOS和Linux平台。 
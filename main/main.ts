import { app, BrowserWindow, globalShortcut } from "electron";
import started from "electron-squirrel-startup";
import { WindowManager } from "./managers/windowManager";
import { ConfigManager } from "./managers/configManager";
import { HotkeyManager } from "./managers/hotkeyManager";
import { TrayManager } from "./managers/trayManager";
import { IPCHandlers } from "./managers/ipcHandlers";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 管理器实例
let windowManager: WindowManager;
let configManager: ConfigManager;
let hotkeyManager: HotkeyManager;
let trayManager: TrayManager;
let ipcHandlers: IPCHandlers;

// 单实例锁，防止重复启动
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // 监听第二个实例启动事件，聚焦现有窗口
  app.on("second-instance", () => {
    windowManager.showMainWindow();
  });
}

// 初始化所有管理器
const initializeManagers = () => {
  // 创建管理器实例
  windowManager = new WindowManager();
  configManager = new ConfigManager();
  hotkeyManager = new HotkeyManager(windowManager, configManager);
  trayManager = new TrayManager(windowManager, configManager);
  ipcHandlers = new IPCHandlers(configManager);

  // 注册 IPC 处理器
  windowManager.registerIPCHandlers();
  configManager.registerIPCHandlers(() => {
    // 配置保存后的回调：应用快捷键并重建托盘
    const result = hotkeyManager.applyHotkeysFromConfig();
    trayManager.recreateTray();
    return result;
  });
  ipcHandlers.registerAllHandlers();
};

// 应用就绪时的初始化
app.on("ready", () => {
  // 初始化管理器
  initializeManagers();

  // 创建主窗口
  windowManager.createMainWindow();

  // 创建系统托盘
  trayManager.createTray();

  // 预热截图窗口
  windowManager.ensureScreenshotWindow();

  // 注册全局快捷键
  hotkeyManager.applyHotkeysFromConfig();
});

// 当所有窗口关闭时，不退出应用，而是隐藏到托盘
app.on("window-all-closed", () => {
  // 在Windows和Linux上，隐藏窗口而不是退出应用
  if (process.platform !== "darwin") {
    // 不调用app.quit()，让应用继续在托盘中运行
    return;
  }
});

// 应用退出时注销全局快捷键
app.on("will-quit", () => {
  hotkeyManager.unregisterAllShortcuts();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});
import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";
import { WindowManager } from "./managers/windowManager";
import { ConfigManager } from "./managers/configManager";
import { HotkeyManager } from "./managers/hotkeyManager";
import { TrayManager } from "./managers/trayManager";
import { IPCHandlers } from "./managers/ipcHandlers";
import { createModuleLogger } from "./utils/logger";

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

// 创建主进程日志器
const logger = createModuleLogger('Main');

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

  // 设置配置更新监听器，确保配置变更时其他模块能及时更新
  configManager.onConfigUpdate(() => {
    logger.info('配置已更新，通知相关模块');
    // 这里可以添加其他需要在配置更新时执行的逻辑
  });
};

// 应用就绪时的初始化
app.on("ready", () => {
  try {
    logger.info('应用启动，开始初始化...');
    
    // 初始化自动更新（仅在打包后的应用中）
    if (app.isPackaged) {
      logger.info('启用自动更新检查...');
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.ElectronPublicUpdateService,
          repo: 'Jeff1573/AI-Text-Scanner'
        },
        updateInterval: '5 minutes',
        // logger: logger,
        notifyUser: true
      });
      logger.info('自动更新已配置');
    } else {
      logger.info('开发环境，跳过自动更新配置');
    }
    
    // 初始化管理器
    initializeManagers();
    logger.info('管理器初始化完成');

    // 创建主窗口
    windowManager.createMainWindow();
    logger.info('主窗口创建完成');

    // 创建系统托盘
    trayManager.createTray();
    logger.info('系统托盘创建完成');

    // 预热截图窗口
    windowManager.ensureScreenshotWindow();
    logger.info('截图窗口预热完成');

    // 注册全局快捷键
    hotkeyManager.applyHotkeysFromConfig();
    logger.info('全局快捷键注册完成');
    
    logger.info('应用初始化完成');
  } catch (error) {
    logger.error('应用初始化失败', { error: error.message, stack: error.stack });
    // 即使初始化失败，也不要退出应用，而是尝试基本功能
    try {
      if (!windowManager) {
        windowManager = new WindowManager();
      }
      windowManager.createMainWindow();
    } catch (fallbackError) {
      logger.error('备用初始化也失败', { error: fallbackError.message, stack: fallbackError.stack });
    }
  }
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
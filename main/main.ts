import { app, nativeImage } from "electron";
import started from "electron-squirrel-startup";
import path from "node:path";
import { WindowManager } from "./managers/windowManager";
import { ConfigManager } from "./managers/configManager";
import { HotkeyManager } from "./managers/hotkeyManager";
import { TrayManager } from "./managers/trayManager";
import { UpdateManager } from "./managers/updateManager";
import { IPCHandlers } from "./managers/ipcHandlers";
import { createModuleLogger } from "./utils/logger";
import { getDockIconPath } from "./utils/iconUtils";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 管理器实例
let windowManager: WindowManager;
let configManager: ConfigManager;
let hotkeyManager: HotkeyManager;
let trayManager: TrayManager;
let updateManager: UpdateManager;
let ipcHandlers: IPCHandlers;

// 创建主进程日志器
const logger = createModuleLogger("Main");

// macOS 提前设置应用名，避免 Dock 显示 Electron（在 ready 之前调用更稳妥）
if (process.platform === "darwin") {
  try { app.setName("AI Text Scanner"); } catch (e) { /* ignore */ }
}

/**
 * 在 macOS 上设置 Dock 图标与应用名。
 * 在开发模式下可能需要多次调用以确保生效。
 */
function setMacDockIconIfPossible(): void {
  if (process.platform !== "darwin") return;
  try {
    try { app.setName("AI Text Scanner"); } catch (e) { /* ignore */ }
    const candidates: string[] = [];
    const dockPath = getDockIconPath();
    if (dockPath) candidates.push(dockPath);
    const pngFallback = path.join(process.cwd(), "build/icons/icon_512.png");
    if (!candidates.includes(pngFallback)) candidates.push(pngFallback);

    for (const p of candidates) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) {
        app.dock.setIcon(img);
        logger.info("已设置 Dock 图标", { path: p });
        break;
      }
    }
  } catch (e) {
    logger.warn("设置 Dock 图标失败", { error: (e as Error).message });
  }
}

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
  updateManager = new UpdateManager();
  ipcHandlers = new IPCHandlers(configManager, updateManager);

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
    logger.info("配置已更新，通知相关模块");
    // 这里可以添加其他需要在配置更新时执行的逻辑
  });
};

// 全局变量：截图窗口预热 Promise 和初始化标志
let screenshotPrewarmPromise: Promise<any> | null = null;
let managersInitialized = false;

// 提前预热：在 ready 事件之前就开始初始化和预热
(async () => {
  try {
    // 等待应用准备就绪（但不等待 ready 事件触发）
    await app.whenReady();

    logger.info("应用已准备就绪，立即初始化管理器并预热截图窗口...");

    // 初始化管理器（只初始化一次）
    if (!managersInitialized) {
      initializeManagers();
      managersInitialized = true;
      logger.info("管理器初始化完成");
    }

    // 立即开始预热截图窗口（最高优先级）
    logger.info("立即开始预热截图窗口（最高优先级）...");
    screenshotPrewarmPromise = windowManager.ensureScreenshotWindow();
  } catch (error) {
    logger.error("提前预热失败", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
})();

// 应用就绪时的初始化
app.on("ready", async () => {
  try {
    logger.info("ready 事件触发，继续初始化流程...");

    // 如果管理器还未初始化（预热失败的情况），在这里初始化
    if (!managersInitialized) {
      logger.warn("管理器未初始化，在 ready 事件中初始化");
      initializeManagers();
      managersInitialized = true;
      screenshotPrewarmPromise = windowManager.ensureScreenshotWindow();
    }

    // 设置 macOS 应用名与 Dock 图标（与预热并行）
    setMacDockIconIfPossible();
    if (!app.isPackaged && process.platform === "darwin") {
      // 开发模式下追加重试，规避偶发不刷新
      setTimeout(() => setMacDockIconIfPossible(), 1000);
      setTimeout(() => setMacDockIconIfPossible(), 3000);
    }

    // 创建主窗口（与截图窗口预热并行）
    windowManager.createMainWindow();
    logger.info("主窗口创建完成");

    // 创建系统托盘（与预热并行）
    trayManager.createTray();
    logger.info("系统托盘创建完成");

    // 等待截图窗口预热完成后再注册快捷键，确保首次触发时窗口已就绪
    await screenshotPrewarmPromise;
    logger.info("截图窗口预热完成，已准备就绪");

    // 注册全局快捷键（此时截图窗口已完全预热）
    hotkeyManager.applyHotkeysFromConfig();
    logger.info("全局快捷键注册完成");

    // 启动时检查更新并启动后台轮询（延迟3秒执行，避免影响启动速度）
    setTimeout(() => {
      void updateManager.checkForUpdatesOnStartup();
      logger.info("启动时更新检查已开始");
      updateManager.startBackgroundPolling();
      logger.info("后台更新轮询已启动");
    }, 3000);

    logger.info("应用初始化完成");
  } catch (error) {
    logger.error("应用初始化失败", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    // 即使初始化失败，也不要退出应用，而是尝试基本功能
    try {
      if (!windowManager) {
        windowManager = new WindowManager();
      }
      windowManager.createMainWindow();
    } catch (fallbackError) {
      logger.error("备用初始化也失败", {
        error: (fallbackError as Error).message,
        stack: (fallbackError as Error).stack,
      });
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
  // 清理后台轮询与全局快捷键
  updateManager.stopBackgroundPolling();
  hotkeyManager.unregisterAllShortcuts();
});

app.on("activate", () => {
  // macOS: 点击 Dock 图标时，显示已存在的主窗口；若不存在则创建
  try {
    windowManager.showMainWindow();
  } catch (_err) {
    try {
      if (!windowManager) {
        windowManager = new WindowManager();
      }
      windowManager.createMainWindow();
    } catch (createError) {
      logger.error("激活时创建主窗口失败", {
        error: (createError as Error).message,
        stack: (createError as Error).stack,
      });
    }
  }
  // 再次尝试设置 Dock 图标，防止开发模式下未生效
  setMacDockIconIfPossible();
});

// 窗口创建时再设一次，进一步提高开发模式下生效概率
app.on("browser-window-created", () => {
  setMacDockIconIfPossible();
});

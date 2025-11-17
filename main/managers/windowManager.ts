import {
  app,
  BrowserWindow,
  session,
  screen,
  ipcMain,
  desktopCapturer,
  nativeImage,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ScreenSource } from "../types";
import { ScreenshotService } from "../services/screenshotService";
import { NativeScreenshotService } from "../services/nativeScreenshotService";
import { createModuleLogger } from "../utils/logger";
import { getAppIconPath } from "../utils/iconUtils";

// 创建WindowManager日志器
const logger = createModuleLogger("WindowManager");

// 定义开发服务器URL和是否为开发环境的判断
const isDevelopment = !app.isPackaged;
const VITE_DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
logger.debug("开发服务器URL", { VITE_DEV_SERVER_URL, isDevelopment, isPackaged: app.isPackaged });

/**
 * 获取正确的preload脚本路径
 * 在开发环境中，preload.js在main目录下
 * 在production环境中，preload.js在构建目录下
 */
function getPreloadPath(): string {
  const basePath = __dirname;
  const preloadPath = path.join(basePath, "./preload.js");
  
  // 检查文件是否存在
  if (fs.existsSync(preloadPath)) {
    logger.debug("找到preload文件", { preloadPath });
    return preloadPath;
  }
  
  // 如果不存在，尝试其他可能的路径
  const alternativePaths = [
    path.join(basePath, "../preload.js"),
    path.join(basePath, "../../preload.js"),
    path.join(process.resourcesPath, "app/.vite/build/preload.js"),
    path.join(process.resourcesPath, "app/main/preload.js"),
  ];
  
  for (const altPath of alternativePaths) {
    if (fs.existsSync(altPath)) {
      logger.debug("找到preload文件（备用路径）", { altPath });
      return altPath;
    }
  }
  
  // 如果都找不到，返回默认路径并记录警告
  logger.warn("未找到preload文件，使用默认路径", { defaultPath: preloadPath });
  return preloadPath;
}
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private screenshotWindow: BrowserWindow | null = null;
  private screenshotPreviewWindows: Map<number, BrowserWindow> = new Map(); // 存储多个截图预览窗口
  private resultWindow: BrowserWindow | null = null;
  private htmlViewerWindow: BrowserWindow | null = null;
  private stickerWindows: Map<number, BrowserWindow> = new Map(); // 存储多个贴图窗口
  private stickerWindowStates: Map<number, { originalWidth: number; originalHeight: number; scale: number }> = new Map(); // 存储贴图窗口状态
  private stickerDragStates: Map<number, { startCursor: Electron.Point; startBounds: Electron.Rectangle }> = new Map(); // 存储贴图窗口拖拽状态
  private screenshotPreviewWindowStates: Map<number, { originalWidth: number; originalHeight: number; scale: number }> = new Map(); // 截图预览窗口缩放状态
  private screenshotPreviewDragStates: Map<number, { startCursor: Electron.Point; startBounds: Electron.Rectangle }> = new Map(); // 截图预览窗口拖拽状态
  private _trayAvailabilityChecked = false;
  private _screenshotReadyListenerRegistered = false;
  private _shouldShowMainWindowOnScreenshotClose = true; // 控制截图窗口关闭时是否显示主窗口
  private _screenshotWindowReady = false; // 标记截图窗口是否已完成预热
  private _isQuitting = false; // 标记应用是否正在退出

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getScreenshotWindow(): BrowserWindow | null {
    return this.screenshotWindow;
  }

  getScreenshotPreviewWindow(): BrowserWindow | null {
    return this.screenshotPreviewWindow;
  }

  getResultWindow(): BrowserWindow | null {
    return this.resultWindow;
  }

  setIsQuitting(isQuitting: boolean): void {
    this._isQuitting = isQuitting;
  }

  getHtmlViewerWindow(): BrowserWindow | null {
    return this.htmlViewerWindow;
  }

  createMainWindow(initialRoute?: string): BrowserWindow | null {
    try {
      logger.info("开始创建主窗口...");

      const iconPath = getAppIconPath();
      logger.debug("图标路径", { iconPath });

      // 根据平台设置不同的窗口配置
      const isMac = process.platform === "darwin";
      const windowConfig: Electron.BrowserWindowConstructorOptions = {
        width: 1100,
        height: 720,
        show: false, // 延迟显示，等待内容加载完成
        center: true, // 居中显示
        frame: false,
        autoHideMenuBar: true,
        backgroundColor: "#242424", // 设置背景色，避免白屏闪烁（与应用主题一致）
        paintWhenInitiallyHidden: true, // 隐藏时也先完成首帧绘制
        webPreferences: {
          preload: getPreloadPath(),
          nodeIntegration: false,
          contextIsolation: true,
        },
        icon: getAppIconPath(),
      };

      // macOS 特定配置：保留原生红绿灯按钮
      if (isMac) {
        windowConfig.titleBarStyle = "hiddenInset";
        windowConfig.trafficLightPosition = { x: 12, y: 12 };
      } else {
        // Windows/Linux：完全隐藏标题栏
        windowConfig.titleBarStyle = "hidden";
      }

      this.mainWindow = new BrowserWindow(windowConfig);

      logger.info("主窗口创建成功", {
        preloadPath: getPreloadPath(),
      });

      // 设置显示媒体请求处理器
      try {
        session.defaultSession.setDisplayMediaRequestHandler(
          (_request, callback) => {
            desktopCapturer
              .getSources({ types: ["screen"] })
              .then((sources) => {
                callback({ video: sources[0] });
              });
          },
          { useSystemPicker: true }
        );
        logger.info("显示媒体请求处理器设置成功");
      } catch (mediaError) {
        logger.warn("显示媒体请求处理器设置失败", {
          error: mediaError.message,
        });
      }

      // 加载页面
      try {
        const normalizedRoute = initialRoute
          ? initialRoute.startsWith("/")
            ? initialRoute
            : `/${initialRoute}`
          : "";

        if (isDevelopment) {
          const url = normalizedRoute
            ? `${VITE_DEV_SERVER_URL}#${normalizedRoute}`
            : VITE_DEV_SERVER_URL;
          logger.debug("加载开发服务器URL", {
            url,
            initialRoute: normalizedRoute || undefined,
          });
          this.mainWindow.loadURL(url);
        } else {
          // 添加调试信息
          logger.info("生产环境路径信息", {
            __dirname,
            resourcesPath: process.resourcesPath,
            appPath: app.getAppPath(),
            isPackaged: app.isPackaged,
          });
          // 生产环境下的正确路径
          const htmlPath = path.join(__dirname, `../renderer/index.html`);
          logger.info("加载HTML文件", { htmlPath, initialRoute: normalizedRoute || undefined });

          const loadWithHash = (filePath: string) => {
            if (normalizedRoute) {
              this.mainWindow!.loadFile(filePath, { hash: normalizedRoute });
            } else {
              this.mainWindow!.loadFile(filePath);
            }
          };

          // 检查文件是否存在
          if (fs.existsSync(htmlPath)) {
            logger.info("HTML文件存在，开始加载");
            loadWithHash(htmlPath);
          } else {
            // 尝试备用路径
            const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
            logger.info("尝试备用HTML路径", { altHtmlPath });

            if (fs.existsSync(altHtmlPath)) {
              logger.info("备用HTML文件存在，开始加载");
              loadWithHash(altHtmlPath);
            } else {
              logger.error("HTML文件不存在", { htmlPath, altHtmlPath });
              throw new Error(`HTML文件不存在: ${htmlPath} 或 ${altHtmlPath}`);
            }
          }
        }
      } catch (loadError) {
        logger.error("页面加载失败", {
          error: loadError.message,
          stack: loadError.stack,
        });
        throw loadError;
      }

      // 设置开发者工具快捷键
      this.mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.mainWindow?.webContents.openDevTools();
        }
      });

      // 添加页面加载失败的处理
      this.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
        logger.error("页面加载失败", {
          errorCode,
          errorDescription,
          validatedURL,
          __dirname,
          resourcesPath: process.resourcesPath
        });
      });

      // 添加页面加载完成的处理
      this.mainWindow.webContents.on("did-finish-load", () => {
        logger.info("页面加载完成");
      });

      // 等待窗口准备好后再显示，避免白屏
      let windowShown = false;
      const showWindow = () => {
        if (!windowShown && this.mainWindow && !this.mainWindow.isDestroyed()) {
          windowShown = true;
          logger.info("主窗口准备就绪，开始显示");
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      };

      // ready-to-show 事件会在页面准备好后触发（包括错误页面）
      this.mainWindow.once("ready-to-show", showWindow);

      // 设置超时保护：如果 10 秒后窗口还没显示，强制显示（防止永远不显示）
      // 这可以处理某些边缘情况，比如页面加载非常慢或 ready-to-show 事件未触发
      setTimeout(() => {
        if (!windowShown) {
          logger.warn("窗口准备超时，强制显示窗口");
          showWindow();
        }
      }, 10000);

      // 添加窗口关闭事件监听器
      this.mainWindow.on("closed", () => {
        logger.debug("主窗口已关闭");
        this.mainWindow = null;
      });

      logger.info("主窗口创建完成");
      return this.mainWindow;
    } catch (error) {
      logger.error("创建主窗口失败", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 确保截图窗口存在并已预热
   * 返回 Promise，在窗口完全加载后 resolve
   */
  async ensureScreenshotWindow(): Promise<BrowserWindow> {
    if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
      logger.debug("截图窗口已存在，直接复用");
      return this.screenshotWindow;
    }

    logger.info("开始创建并预热截图窗口...");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.bounds; // 覆盖整个物理屏幕，避免 workArea 带来的缝隙

    // 截图窗口配置（全屏，无需标题栏）
    const isMac = process.platform === "darwin";
    const screenshotConfig: Electron.BrowserWindowConstructorOptions = {
      x,
      y,
      width,
      height,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      backgroundColor: "#1a1a1a", // 避免白屏闪烁
      paintWhenInitiallyHidden: true, // 隐藏时也先完成首帧绘制
      resizable: false,
      movable: false,
      fullscreen: false, // 避免切入系统级全屏引起的闪屏
      fullscreenable: false,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    };

    // macOS 全屏窗口配置
    if (isMac) {
      screenshotConfig.titleBarStyle = "hidden";
      screenshotConfig.transparent = false;
    } else {
      screenshotConfig.titleBarStyle = "hidden";
    }

    this.screenshotWindow = new BrowserWindow(screenshotConfig);

    // 等待页面加载完成
    const loadPromise = new Promise<void>((resolve) => {
      this.screenshotWindow!.webContents.once("did-finish-load", () => {
        logger.info("截图窗口页面加载完成");
        this._screenshotWindowReady = true;
        resolve();
      });
    });

    if (isDevelopment) {
      const url = `${VITE_DEV_SERVER_URL}#/screenshot`;
      logger.debug("预热加载URL", { url });
      this.screenshotWindow.loadURL(url);
    } else {
      const htmlPath = path.join(__dirname, `../renderer/index.html`);
      if (fs.existsSync(htmlPath)) {
        this.screenshotWindow.loadFile(htmlPath, {
          hash: "/screenshot",
        });
      } else {
        const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
        this.screenshotWindow.loadFile(altHtmlPath, {
          hash: "/screenshot",
        });
      }
    }

    // 移除旧的延迟显示逻辑，现在窗口会立即显示
    // 保留监听器以兼容旧代码
    if (!this._screenshotReadyListenerRegistered) {
      ipcMain.on("screenshot-image-ready", () => {
        // 这个事件现在不再需要，窗口已经提前显示了
        logger.debug("收到 screenshot-image-ready 事件（已废弃，窗口已提前显示）");
      });
      this._screenshotReadyListenerRegistered = true;
    }

    this.screenshotWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        logger.error("截图窗口加载失败", { errorCode, errorDescription });
      }
    );

    // 改为隐藏而不是销毁窗口，保持窗口常驻以提升响应速度
    this.screenshotWindow.on("close", (event) => {
      if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
        // 如果应用正在退出，允许窗口真正关闭
        if (this._isQuitting) {
          logger.debug("应用正在退出，允许截图窗口真正关闭");
          return;
        }

        event.preventDefault(); // 阻止窗口关闭

        // 禁用动画效果：先设置不透明度为0，再隐藏窗口
        this.screenshotWindow.setOpacity(0);
        this.screenshotWindow.hide();
        logger.debug("截图窗口已隐藏（保持常驻，无动画）");

        const shouldShowMain = this._shouldShowMainWindowOnScreenshotClose;
        // 重置标志为默认值
        this._shouldShowMainWindowOnScreenshotClose = true;

        // 如果主窗口存在但被隐藏，并且没有其他窗口打开，且允许显示主窗口，则重新显示主窗口
        if (this.mainWindow && !this.mainWindow.isDestroyed() && shouldShowMain) {
          // 检查是否有其他窗口打开
          const hasOtherWindows =
            (this.resultWindow && !this.resultWindow.isDestroyed()) ||
            (this.htmlViewerWindow && !this.htmlViewerWindow.isDestroyed());

          if (!this.mainWindow.isVisible() && !hasOtherWindows) {
            logger.debug("截图窗口关闭且无其他窗口，重新显示主窗口");
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      }
    });

    // 监听窗口隐藏事件，通知渲染进程清理状态
    this.screenshotWindow.on("hide", () => {
      if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
        logger.debug("截图窗口隐藏，发送清理状态事件到渲染进程");
        this.screenshotWindow.webContents.send("screenshot-window-hide");
      }
    });

    // 等待页面加载完成
    await loadPromise;
    logger.info("截图窗口预热完成，已准备就绪");

    return this.screenshotWindow;
  }

  /**
   * 检查截图窗口是否已预热完成
   */
  isScreenshotWindowReady(): boolean {
    return this._screenshotWindowReady &&
           this.screenshotWindow !== null &&
           !this.screenshotWindow.isDestroyed();
  }

  async createScreenshotWindow(screenshotData: ScreenSource): Promise<void> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
    }

    // 确保窗口已预热（如果已预热则立即返回）
    const win = await this.ensureScreenshotWindow();

    // 重新设置窗口位置和尺寸，确保覆盖整个屏幕（支持多显示器和分辨率变化）
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.bounds;
    win.setBounds({ x, y, width, height });
    logger.debug("更新截图窗口尺寸", { x, y, width, height });

    // 在显示窗口前，等待渲染端图片 onLoad 完成后发回的通知，避免用户看到加载态及白屏
    // 兜底：先确保窗口可见，避免因 ready 事件竞态导致保持隐藏
    try {
      if (!win.isDestroyed()) {
        win.setOpacity(1);
        if (!win.isVisible()) {
          win.show();
        }
        win.focus();
      }
    } catch (error) {
      // 忽略错误，使用兜底方案
      logger.warn("提前显示窗口失败", { error });
    }
    let readyHandled = false;
    const readyHandler = (event: Electron.IpcMainEvent) => {
      try {
        if (readyHandled) return;
        if (win.isDestroyed()) return;
        // 仅响应来自当前截图窗口的就绪事件
        if (event.sender.id !== win.webContents.id) return;
        readyHandled = true;
        ipcMain.removeListener("screenshot-image-ready", readyHandler);
        if (!win.isVisible()) {
          // 恢复不透明度并显示窗口（无动画）
          win.setOpacity(1);
          win.show();
          win.focus();
        }
      } catch (e) {
        logger.warn("显示截图窗口时发生异常，回退直接显示", { error: e instanceof Error ? e.message : e });
        if (!win.isDestroyed() && !win.isVisible()) {
          win.setOpacity(1);
          win.show();
          win.focus();
        }
      }
    };
    ipcMain.on("screenshot-image-ready", readyHandler);

    const sendData = () => {
      if (!win.isDestroyed()) {
        logger.info("发送截图数据到已预热的窗口", {
          dataSize: screenshotData.thumbnail.length,
        });
        win.webContents.send("screenshot-data", screenshotData);
      }
    };

    // 由于窗口已预热，直接发送数据
    if (win.webContents.isLoading()) {
      win.webContents.once("did-finish-load", () => {
        sendData();
      });
    } else {
      sendData();
    }

    // 清理监听器：窗口隐藏后
    win.once("hide", () => {
      ipcMain.removeListener("screenshot-image-ready", readyHandler);
    });
  }

  createResultWindow(resultContent: string): void {
    if (this.resultWindow) {
      this.resultWindow.close();
      this.resultWindow.destroy();
    }

    // 根据平台设置窗口配置
    const isMac = process.platform === "darwin";
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: 980,
      height: 640,
      show: false, // 防止窗口在准备好之前显示
      center: true, // 居中显示
      resizable: true, // 允许调整大小
      alwaysOnTop: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
    };

    if (isMac) {
      windowConfig.titleBarStyle = "hiddenInset";
      windowConfig.trafficLightPosition = { x: 12, y: 12 };
    } else {
      windowConfig.titleBarStyle = "hidden";
    }

    this.resultWindow = new BrowserWindow(windowConfig);

    if (isDevelopment) {
      this.resultWindow.loadURL(`${VITE_DEV_SERVER_URL}#/result`);
    } else {
      const htmlPath = path.join(__dirname, `../renderer/index.html`);
      if (fs.existsSync(htmlPath)) {
        this.resultWindow.loadFile(htmlPath, {
          hash: "/result",
        });
      } else {
        const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
        this.resultWindow.loadFile(altHtmlPath, {
          hash: "/result",
        });
      }
    }

    this.resultWindow.on("ready-to-show", () => {
      logger.info("结果窗口加载完成");

      if (this.resultWindow && !this.resultWindow.isDestroyed()) {
        this.resultWindow.show(); // 显示窗口
        this.resultWindow.focus(); // 聚焦窗口
        const dataToSend =
          typeof resultContent === "string"
            ? JSON.stringify({ original: resultContent })
            : resultContent;
        this.resultWindow.webContents.send("result-data", dataToSend);
      }
    });

    this.resultWindow.on("closed", () => {
      logger.debug("结果窗口已关闭");
      this.resultWindow = null;
      // 不再自动显示主窗口，改为由用户通过 Dock 或托盘手动唤起
    });
  }

  /**
   * 创建截图预览窗口
   * 
   * 用于显示原生截图的结果，并提供操作工具栏
   */
  createScreenshotPreviewWindow(imageData: string): BrowserWindow {
    logger.info("创建截图预览窗口");

    const isMac = process.platform === "darwin";

    // 根据图片尺寸动态计算窗口大小，使窗口与截图大小尽量一致
    let imageWidth = 900;
    let imageHeight = 700;

    try {
      const image = nativeImage.createFromDataURL(imageData);
      const size = image.getSize();

      if (size.width > 0 && size.height > 0) {
        imageWidth = size.width;
        imageHeight = size.height;
      } else {
        logger.warn("解析截图尺寸结果为空，使用默认预览窗口大小");
      }
    } catch (error) {
      logger.warn("解析截图尺寸失败，使用默认预览窗口大小", {
        error: error instanceof Error ? error.message : "未知错误",
      });
    }

    // 预留一部分高度用于底部工具栏，避免遮挡图片内容
    const TOOLBAR_EXTRA_HEIGHT = 80;

    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: imageWidth,
      height: imageHeight + TOOLBAR_EXTRA_HEIGHT,
      show: false,
      center: true,
      resizable: true,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
    };

    if (isMac) {
      windowConfig.titleBarStyle = "hiddenInset";
      windowConfig.trafficLightPosition = { x: 12, y: 12 };
    } else {
      windowConfig.titleBarStyle = "hidden";
    }

    const screenshotPreviewWindow = new BrowserWindow(windowConfig);

    // 存储窗口实例和初始状态
    this.screenshotPreviewWindows.set(screenshotPreviewWindow.id, screenshotPreviewWindow);
    this.screenshotPreviewWindowStates.set(screenshotPreviewWindow.id, {
      originalWidth: imageWidth,
      originalHeight: imageHeight + TOOLBAR_EXTRA_HEIGHT,
      scale: 1,
    });

    if (isDevelopment) {
      screenshotPreviewWindow.loadURL(`${VITE_DEV_SERVER_URL}#/screenshot-preview`);
    } else {
      const htmlPath = path.join(__dirname, `../renderer/index.html`);
      if (fs.existsSync(htmlPath)) {
        screenshotPreviewWindow.loadFile(htmlPath, {
          hash: "/screenshot-preview",
        });
      } else {
        const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
        screenshotPreviewWindow.loadFile(altHtmlPath, {
          hash: "/screenshot-preview",
        });
      }
    }

    screenshotPreviewWindow.on("ready-to-show", () => {
      logger.info("截图预览窗口加载完成", { id: screenshotPreviewWindow.id });

      if (!screenshotPreviewWindow.isDestroyed()) {
        screenshotPreviewWindow.show();
        screenshotPreviewWindow.focus();

        // 发送截图数据到渲染进程
        screenshotPreviewWindow.webContents.send("screenshot-preview-data", imageData);
      }
    });

    // 窗口关闭时从 Map 中移除
    screenshotPreviewWindow.on("closed", () => {
      logger.debug("截图预览窗口已关闭", { id: screenshotPreviewWindow.id });
      this.screenshotPreviewWindows.delete(screenshotPreviewWindow.id);
      this.screenshotPreviewWindowStates.delete(screenshotPreviewWindow.id);
      this.screenshotPreviewDragStates.delete(screenshotPreviewWindow.id);
    });

    logger.info("截图预览窗口创建成功", { id: screenshotPreviewWindow.id });
    return screenshotPreviewWindow;
  }

  createHtmlViewerWindow(htmlContent: string, title = "AI 分析结果"): void {
    // 记录标题信息
    logger.debug("创建HTML查看器窗口", { title });
    // 如果已有HTML查看器窗口，先关闭
    if (this.htmlViewerWindow) {
      this.htmlViewerWindow.close();
      this.htmlViewerWindow.destroy();
    }

    // 根据平台设置窗口配置
    const isMac = process.platform === "darwin";
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: 820,
      height: 500,
      show: false, // 防止窗口在准备好之前显示
      center: true, // 居中显示
      resizable: true, // 允许调整大小
      alwaysOnTop: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
    };

    if (isMac) {
      windowConfig.titleBarStyle = "hiddenInset";
      windowConfig.trafficLightPosition = { x: 12, y: 12 };
    } else {
      windowConfig.titleBarStyle = "hidden";
    }

    this.htmlViewerWindow = new BrowserWindow(windowConfig);

    // 加载HTML内容
    // 加载页面
    try {
      if (isDevelopment) {
        logger.debug("加载开发服务器URL", {
          url: VITE_DEV_SERVER_URL,
        });
        this.htmlViewerWindow.loadURL(`${VITE_DEV_SERVER_URL}#/image-analysis`);
      } else {
        const htmlPath = path.join(__dirname, `../renderer/index.html`);
        logger.debug("加载HTML文件", { htmlPath });
        if (fs.existsSync(htmlPath)) {
          this.htmlViewerWindow.loadFile(htmlPath, {
            hash: "image-analysis",
          });
        } else {
          const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
          this.htmlViewerWindow.loadFile(altHtmlPath, {
            hash: "image-analysis",
          });
        }
      }
    } catch (loadError) {
      logger.error("页面加载失败", {
        error: loadError.message,
        stack: loadError.stack,
      });
      throw loadError;
    }

    this.htmlViewerWindow.once("ready-to-show", () => {
      if (this.htmlViewerWindow && !this.htmlViewerWindow.isDestroyed()) {
        this.htmlViewerWindow.show();
        this.htmlViewerWindow.focus();
        this.htmlViewerWindow.webContents.send(
          "image-analysis-result",
          htmlContent
        );
      }
    });

    this.htmlViewerWindow.on("closed", () => {
      logger.debug("HTML查看器窗口已关闭");
      this.htmlViewerWindow = null;
      
      // 如果主窗口存在但被隐藏，重新显示它
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (!this.mainWindow.isVisible()) {
          // logger.debug("HTML查看器窗口关闭后，重新显示主窗口");
          // this.mainWindow.show();
          // this.mainWindow.focus();
        }
      }
    });

    // 开发者工具快捷键和ESC关闭窗口
    this.htmlViewerWindow.webContents.on(
      "before-input-event",
      (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.htmlViewerWindow?.webContents.openDevTools();
        } else if (input.key === "Escape") {
          event.preventDefault();
          this.htmlViewerWindow?.close();
        }
      }
    );
  }

  async hideAllWindows(): Promise<void> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  showMainWindow(): void {
    // 检查主窗口是否存在且未被销毁
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      logger.debug("主窗口存在，准备显示", {
        isVisible: this.mainWindow.isVisible(),
        isMinimized: this.mainWindow.isMinimized()
      });

      // 如果窗口最小化，先恢复
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }

      // 显示并聚焦窗口
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show();
      }
      this.mainWindow.focus();

      // 导航到主界面（首页）
      this.mainWindow.webContents.send("navigate-to", "/");
    } else {
      logger.debug("主窗口不存在或已销毁，创建新窗口", {
        mainWindowExists: !!this.mainWindow,
        isDestroyed: this.mainWindow ? this.mainWindow.isDestroyed() : "N/A"
      });
      // 清空引用（防止持有已销毁窗口的引用）
      this.mainWindow = null;
      this.createMainWindow();
    }
  }

  /**
   * 创建贴图窗口
   * @param imageData 图片的 base64 数据
   * @param width 图片宽度
   * @param height 图片高度
   */
  createStickerWindow(imageData: string, width: number, height: number): BrowserWindow {
    logger.info("创建贴图窗口", { width, height });

    // 计算窗口初始尺寸（保持图片比例，设置合理的最大尺寸）
    const maxWidth = 800;
    const maxHeight = 600;
    let windowWidth = width;
    let windowHeight = height;

    // 如果图片过大，按比例缩小
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      windowWidth = Math.round(width * ratio);
      windowHeight = Math.round(height * ratio);
    }

    // 贴图窗口配置
    const stickerConfig: Electron.BrowserWindowConstructorOptions = {
      width: windowWidth,
      height: windowHeight,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000", // 完全透明背景，避免拖动时出现白色空隙
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      autoHideMenuBar: true,
      hasShadow: false, // 禁用窗口阴影，提升拖动性能
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
        offscreen: false, // 确保使用硬件加速
      },
    };

    const stickerWindow = new BrowserWindow(stickerConfig);

    // 存储窗口实例和初始状态
    this.stickerWindows.set(stickerWindow.id, stickerWindow);
    this.stickerWindowStates.set(stickerWindow.id, {
      originalWidth: width,
      originalHeight: height,
      scale: windowWidth / width, // 初始scale值
    });

    // 加载贴图页面
    if (isDevelopment) {
      stickerWindow.loadURL(`${VITE_DEV_SERVER_URL}#/sticker`);
    } else {
      const htmlPath = path.join(__dirname, `../renderer/index.html`);
      if (fs.existsSync(htmlPath)) {
        stickerWindow.loadFile(htmlPath, { hash: "/sticker" });
      } else {
        const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
        stickerWindow.loadFile(altHtmlPath, { hash: "/sticker" });
      }
    }

    // 窗口准备就绪后发送图片数据
    stickerWindow.once("ready-to-show", () => {
      if (!stickerWindow.isDestroyed()) {
        stickerWindow.show();
        stickerWindow.webContents.send("sticker-data", {
          imageData,
          width,
          height,
        });
      }
    });

    // 窗口关闭时从 Map 中移除
    stickerWindow.on("closed", () => {
      logger.debug("贴图窗口已关闭", { id: stickerWindow.id });
      this.stickerWindows.delete(stickerWindow.id);
      this.stickerWindowStates.delete(stickerWindow.id);
      this.stickerDragStates.delete(stickerWindow.id);
    });

    // 开发者工具快捷键
    stickerWindow.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12") {
        event.preventDefault();
        stickerWindow.webContents.openDevTools();
      }
    });

    logger.info("贴图窗口创建成功", { id: stickerWindow.id });
    return stickerWindow;
  }

  /**
   * 关闭指定的贴图窗口
   */
  closeStickerWindow(windowId: number): void {
    const window = this.stickerWindows.get(windowId);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  /**
   * 关闭所有贴图窗口
   */
  closeAllStickerWindows(): void {
    this.stickerWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.stickerWindows.clear();
  }

  registerIPCHandlers(): void {
    ipcMain.handle("open-result-window", async (_event, resultContent) => {
      try {
        logger.debug("打开结果窗口", { resultContent });
        this.createResultWindow(resultContent);
        return { success: true };
      } catch (error) {
        logger.error("打开结果窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 打开主窗口并导航到指定路由
    ipcMain.handle("open-main-window-with-route", async (_event, route: string) => {
      try {
        logger.debug("打开主窗口并导航", { route });

        const isNewWindow = !this.mainWindow || this.mainWindow.isDestroyed();
        if (isNewWindow) {
          // 新建主窗口时，直接以目标路由作为初始 hash 加载，避免先落在首页再跳转
          this.createMainWindow(route);
        }

        if (this.mainWindow) {
          // 对于已经存在的主窗口，优先发送导航事件，再显示窗口，尽量避免先闪现旧页面
          if (!isNewWindow) {
            this.mainWindow.webContents.send("navigate-to", route);
          }

          this.mainWindow.show();
          this.mainWindow.focus();
        }

        return { success: true };
      } catch (error) {
        logger.error("打开主窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 原生交互式截图
    ipcMain.handle("capture-screen-native", async () => {
      try {
        logger.info("启动原生截图模式");
        
        // 检查是否支持原生截图
        const isAvailable = await NativeScreenshotService.isAvailable();
        if (!isAvailable) {
          return {
            success: false,
            error: "系统不支持原生截图功能",
            errorCode: "NOT_SUPPORTED",
          };
        }

        // 使用原生截图工具（会弹出系统截图界面，用户选择区域）
        const filepath = await NativeScreenshotService.captureInteractive();
        
        // 读取截图并转换为 data URL
        const dataURL = await NativeScreenshotService.readScreenshotAsDataURL(filepath);
        
        // 清理临时文件
        NativeScreenshotService.cleanupScreenshot(filepath);

        logger.info("原生截图完成，打开预览窗口");

        // 创建预览窗口显示截图
        this.createScreenshotPreviewWindow(dataURL);

        return {
          success: true,
        };
      } catch (error) {
        const err = error as Error;
        logger.error("原生截图失败", { 
          error: err.message,
        });

        return {
          success: false,
          error: err.message.includes("取消") 
            ? "已取消截图" 
            : `截图失败: ${err.message}`,
          errorCode: err.message.includes("取消") ? "USER_CANCELLED" : "SCREENSHOT_FAILED",
        };
      }
    });

    // 原有的截图方法（使用 desktopCapturer）
    ipcMain.handle("capture-screen", async () => {
      try {
        await this.hideAllWindows();
        const sources = await ScreenshotService.captureAllScreens();

        const result = {
          success: true,
          sources: sources,
        };

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.show();
        }

        return result;
      } catch (error) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.show();
        }

        logger.error("截图失败", { 
          error: error instanceof Error ? error.message : "未知错误"
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    ipcMain.handle(
      "create-screenshot-window",
      async (_event, screenshotData) => {
        try {
          // logger.debug("收到创建截图窗口请求", { screenshotData });
          await this.createScreenshotWindow(screenshotData);
          return { success: true };
        } catch (error) {
          logger.error("创建截图窗口失败", {
            error: error instanceof Error ? error.message : "未知错误",
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );

    // 创建贴图窗口
    ipcMain.handle("create-sticker-window", async (_event, imageData: string, width: number, height: number) => {
      try {
        logger.debug("收到创建贴图窗口请求", { width, height });
        this.createStickerWindow(imageData, width, height);
        return { success: true };
      } catch (error) {
        logger.error("创建贴图窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 关闭贴图窗口
    ipcMain.handle("close-sticker-window", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });

    // 缩放贴图窗口（支持鼠标锚点）
    ipcMain.handle("scale-sticker-window", (event, deltaY: number, anchor?: { x: number; y: number; dpr?: number }) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return { success: false };

        const state = this.stickerWindowStates.get(win.id);
        if (!state) return { success: false };

        const oldBounds = win.getBounds();

        // 连续缩放：按滚轮增量计算比例
        const factor = Math.exp(-deltaY * 0.0015);
        const minScale = 0.1;
        const maxScale = 6;
        const newScale = Math.min(maxScale, Math.max(minScale, state.scale * factor));
        const newWidth = Math.max(1, Math.round(state.originalWidth * newScale));
        const newHeight = Math.max(1, Math.round(state.originalHeight * newScale));

        // 计算锚点位置（DIP坐标，clientX/clientY 本身就是 DIP，无需除以 dpr）
        const axDip = anchor ? anchor.x : oldBounds.width / 2;
        const ayDip = anchor ? anchor.y : oldBounds.height / 2;

        // 计算缩放比例
        const ratioW = newWidth / oldBounds.width;
        const ratioH = newHeight / oldBounds.height;

        // 计算新的窗口位置（围绕锚点缩放）
        const newX = Math.round(oldBounds.x - axDip * (ratioW - 1));
        const newY = Math.round(oldBounds.y - ayDip * (ratioH - 1));

        // 原子更新窗口位置和大小
        win.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });

        // 更新状态
        this.stickerWindowStates.set(win.id, { ...state, scale: newScale });

        return { success: true };
      } catch (error) {
        logger.error("缩放贴图窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 缩放截图预览窗口（支持鼠标锚点）
    ipcMain.handle("scale-screenshot-preview-window", (event, deltaY: number, anchor?: { x: number; y: number; dpr?: number }) => {
      try {
        const windowId = event.sender.getOwnerBrowserWindow()?.id;
        if (!windowId) return { success: false };

        const win = this.screenshotPreviewWindows.get(windowId);
        if (!win || win.isDestroyed()) return { success: false };

        const state = this.screenshotPreviewWindowStates.get(windowId);
        if (!state) return { success: false };

        const oldBounds = win.getBounds();

        // 连续缩放：按滚轮增量计算比例
        const factor = Math.exp(-deltaY * 0.0015);
        const minScale = 0.1;
        const maxScale = 6;
        const newScale = Math.min(maxScale, Math.max(minScale, state.scale * factor));
        const newWidth = Math.max(1, Math.round(state.originalWidth * newScale));
        const newHeight = Math.max(1, Math.round(state.originalHeight * newScale));

        // 计算锚点位置（DIP坐标，clientX/clientY 本身就是 DIP，无需除以 dpr）
        const axDip = anchor ? anchor.x : oldBounds.width / 2;
        const ayDip = anchor ? anchor.y : oldBounds.height / 2;

        // 计算缩放比例
        const ratioW = newWidth / oldBounds.width;
        const ratioH = newHeight / oldBounds.height;

        // 计算新的窗口位置（围绕锚点缩放）
        const newX = Math.round(oldBounds.x - axDip * (ratioW - 1));
        const newY = Math.round(oldBounds.y - ayDip * (ratioH - 1));

        // 原子更新窗口位置和大小
        win.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });

        // 更新状态
        this.screenshotPreviewWindowStates.set(windowId, { ...state, scale: newScale });

        return { success: true };
      } catch (error) {
        logger.error("缩放截图预览窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    /**
     * 开始拖拽截图预览窗口
     *
     * 记录起始鼠标位置和窗口位置，用于后续计算相对位移
     */
    ipcMain.handle("begin-screenshot-preview-drag", (event) => {
      try {
        const windowId = event.sender.getOwnerBrowserWindow()?.id;
        if (!windowId) return;

        const win = this.screenshotPreviewWindows.get(windowId);
        if (!win || win.isDestroyed()) return;

        // 获取当前鼠标屏幕坐标
        const startCursor = screen.getCursorScreenPoint();
        // 获取当前窗口位置和大小
        const startBounds = win.getBounds();

        // 保存起始状态
        this.screenshotPreviewDragStates.set(windowId, { startCursor, startBounds });
      } catch (error) {
        logger.error("开始拖拽截图预览窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    /**
     * 拖拽截图预览窗口中
     *
     * 根据鼠标移动距离计算新的窗口位置
     * 使用相对位移算法避免累积误差
     */
    ipcMain.handle("drag-screenshot-preview-window", (event) => {
      try {
        const windowId = event.sender.getOwnerBrowserWindow()?.id;
        if (!windowId) return;

        const win = this.screenshotPreviewWindows.get(windowId);
        if (!win || win.isDestroyed()) return;

        const dragState = this.screenshotPreviewDragStates.get(windowId);
        if (!dragState) return;

        // 获取当前鼠标位置
        const currentCursor = screen.getCursorScreenPoint();

        // 计算鼠标移动的相对距离
        const dx = Math.round(currentCursor.x - dragState.startCursor.x);
        const dy = Math.round(currentCursor.y - dragState.startCursor.y);

        // 更新窗口位置（相对于起始位置的偏移）
        // 保持窗口尺寸不变，只更新位置
        // false 参数表示不使用动画，立即更新
        win.setBounds({
          x: dragState.startBounds.x + dx,
          y: dragState.startBounds.y + dy,
          width: dragState.startBounds.width,
          height: dragState.startBounds.height,
        }, false);
      } catch (error) {
        logger.error("拖拽截图预览窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    /**
     * 结束拖拽截图预览窗口
     *
     * 清理拖拽状态
     */
    ipcMain.handle("end-screenshot-preview-drag", (event) => {
      try {
        const windowId = event.sender.getOwnerBrowserWindow()?.id;
        if (!windowId) return;

        // 清理拖拽状态
        this.screenshotPreviewDragStates.delete(windowId);
      } catch (error) {
        logger.error("结束拖拽截图预览窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    // 重置贴图窗口大小到原始比例
    ipcMain.handle("reset-sticker-window", (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
          const state = this.stickerWindowStates.get(win.id);
          if (state) {
            // 重置scale为1
            state.scale = 1;
            const newWidth = Math.round(state.originalWidth);
            const newHeight = Math.round(state.originalHeight);

            // 调整窗口大小
            win.setSize(newWidth, newHeight, true);
            logger.debug("重置贴图窗口大小", { windowId: win.id, newWidth, newHeight });
          }
        }
        return { success: true };
      } catch (error) {
        logger.error("重置贴图窗口大小失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 开始拖拽贴图窗口
    ipcMain.handle("begin-sticker-drag", (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        const startCursor = screen.getCursorScreenPoint();
        const startBounds = win.getBounds();
        // logger.debug("开始拖拽", { startCursor, startBounds });
        this.stickerDragStates.set(win.id, { startCursor, startBounds });
      } catch (error) {
        logger.error("开始拖拽贴图窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    // 拖拽贴图窗口中（rAF 心跳）
    ipcMain.handle("drag-sticker-window", (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        const dragState = this.stickerDragStates.get(win.id);
        if (!dragState) return;

        const currentCursor = screen.getCursorScreenPoint();
        const dx = Math.round(currentCursor.x - dragState.startCursor.x);
        const dy = Math.round(currentCursor.y - dragState.startCursor.y);

        // 使用初始记录的宽高，只更新位置，避免窗口大小意外变化
        win.setBounds({
          x: dragState.startBounds.x + dx,
          y: dragState.startBounds.y + dy,
          width: dragState.startBounds.width,
          height: dragState.startBounds.height,
        }, false); // false = 禁用动画，立即更新
      } catch (error) {
        logger.error("拖拽贴图窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    // 结束拖拽贴图窗口
    ipcMain.handle("end-sticker-drag", (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        this.stickerDragStates.delete(win.id);
      } catch (error) {
        logger.error("结束拖拽贴图窗口失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    });

    ipcMain.handle("window-minimize", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.minimize();
      }
    });

    ipcMain.handle("window-maximize", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    ipcMain.handle("window-close", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });

    // 关闭截图窗口而不显示主窗口（用于复制操作后关闭）
    ipcMain.handle("close-screenshot-window-without-showing-main", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed() && win === this.screenshotWindow) {
        // 设置标志，表示关闭时不要显示主窗口
        this._shouldShowMainWindowOnScreenshotClose = false;
        win.close();
      }
    });

    ipcMain.handle("window-hide", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        logger.debug("隐藏窗口", { 
          isVisible: win.isVisible(),
          title: win.getTitle() 
        });
        win.hide();
      }
    });

    ipcMain.handle("get-platform", () => {
      return process.platform;
    });

    ipcMain.handle("hide-to-tray", (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.hide();
      }
    });

    ipcMain.handle("show-from-tray", () => {
      this.showMainWindow();
    });

    ipcMain.handle("is-tray-available", () => {
      try {
        // 检查托盘是否可用（在Windows上通常可用）
        const isAvailable =
          process.platform === "win32" ||
          process.platform === "linux" ||
          process.platform === "darwin";
        // 只在首次检查时记录日志，避免重复打印
        if (!this._trayAvailabilityChecked) {
          logger.info("检查托盘可用性", {
            platform: process.platform,
            isAvailable,
          });
          this._trayAvailabilityChecked = true;
        }
        return isAvailable;
      } catch (error) {
        logger.error("检查托盘可用性失败", {
          error: error instanceof Error ? error.message : "未知错误",
        });
        return false;
      }
    });

    // HTML查看器窗口
    ipcMain.handle(
      "open-html-viewer",
      async (_event, htmlContent: string, title?: string) => {
        try {
          logger.debug("打开HTML查看器", {
            contentLength: htmlContent?.length,
            title,
          });
          this.createHtmlViewerWindow(htmlContent, title);
          return { success: true };
        } catch (error) {
          logger.error("创建HTML查看器窗口失败", {
            error: error instanceof Error ? error.message : "未知错误",
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );
  }
}

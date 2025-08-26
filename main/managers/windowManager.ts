import {
  app,
  BrowserWindow,
  session,
  screen,
  ipcMain,
  desktopCapturer,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ScreenSource } from "../types";
import { ScreenshotService } from "../services/screenshotService";
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
  private resultWindow: BrowserWindow | null = null;
  private htmlViewerWindow: BrowserWindow | null = null;

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getScreenshotWindow(): BrowserWindow | null {
    return this.screenshotWindow;
  }

  getResultWindow(): BrowserWindow | null {
    return this.resultWindow;
  }

  getHtmlViewerWindow(): BrowserWindow | null {
    return this.htmlViewerWindow;
  }

  createMainWindow(): BrowserWindow | null {
    try {
      logger.info("开始创建主窗口...");

      const iconPath = getAppIconPath();
      logger.debug("图标路径", { iconPath });

      this.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        titleBarStyle: "hidden",
        autoHideMenuBar: true,
        webPreferences: {
          preload: getPreloadPath(),
          nodeIntegration: false,
          contextIsolation: true,
        },
        icon: getAppIconPath(),
      });

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
        if (isDevelopment) {
          logger.debug("加载开发服务器URL", {
            url: VITE_DEV_SERVER_URL,
          });
          this.mainWindow.loadURL(VITE_DEV_SERVER_URL);
        } else {
          // 添加调试信息
          logger.info("生产环境路径信息", {
            __dirname,
            resourcesPath: process.resourcesPath,
            appPath: app.getAppPath(),
            isPackaged: app.isPackaged
          });
          // 生产环境下的正确路径
          const htmlPath = path.join(__dirname, `../renderer/index.html`);
          logger.info("加载HTML文件", { htmlPath });
          
          // 检查文件是否存在
          if (fs.existsSync(htmlPath)) {
            logger.info("HTML文件存在，开始加载");
            this.mainWindow.loadFile(htmlPath);
          } else {
            // 尝试备用路径
            const altHtmlPath = path.join(process.resourcesPath, "app/.vite/renderer/index.html");
            logger.info("尝试备用HTML路径", { altHtmlPath });
            
            if (fs.existsSync(altHtmlPath)) {
              logger.info("备用HTML文件存在，开始加载");
              this.mainWindow.loadFile(altHtmlPath);
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

  ensureScreenshotWindow(): BrowserWindow {
    if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
      return this.screenshotWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.screenshotWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      show: false,
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });

    if (isDevelopment) {
      const url = `${VITE_DEV_SERVER_URL}#/screenshot`;
      // this.screenshotWindow.webContents.openDevTools()
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

    // // 开发者工具快捷键
    // this.screenshotWindow.webContents.on(
    //   "before-input-event",
    //   (event, input) => {
    //     if (input.key === "F12") {
    //       event.preventDefault();
    //       this.screenshotWindow?.webContents.openDevTools();
    //     }
    //   }
    // );

    ipcMain.on("screenshot-image-ready", () => {
      if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
        if (!this.screenshotWindow.isVisible()) {
          this.screenshotWindow.show();
          this.screenshotWindow.focus();
        }
      }
    });

    this.screenshotWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        logger.error("窗口加载失败", { errorCode, errorDescription });
      }
    );

    this.screenshotWindow.on("closed", () => {
      this.screenshotWindow = null;
    });

    return this.screenshotWindow;
  }

  createScreenshotWindow(screenshotData: ScreenSource): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
    }
    const win = this.ensureScreenshotWindow();

    const sendOnly = () => {
      if (!win.isDestroyed()) {
        win.webContents.send("screenshot-data", screenshotData);
      }
    };

    if (win.webContents.isLoading()) {
      win.webContents.once("did-finish-load", sendOnly);
    } else {
      sendOnly();
    }
  }

  createResultWindow(resultContent: string): void {
    if (this.resultWindow) {
      this.resultWindow.close();
      this.resultWindow.destroy();
    }

    this.resultWindow = new BrowserWindow({
      width: 600,
      height: 400,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      titleBarStyle: "hidden",
    });

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

      if (this.resultWindow) {
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
    });
  }

  createHtmlViewerWindow(htmlContent: string, title = "AI 分析结果"): void {
    // 记录标题信息
    logger.debug("创建HTML查看器窗口", { title });
    // 如果已有HTML查看器窗口，先关闭
    if (this.htmlViewerWindow) {
      this.htmlViewerWindow.close();
      this.htmlViewerWindow.destroy();
    }

    this.htmlViewerWindow = new BrowserWindow({
      width: 820,
      height: 500,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      icon: getAppIconPath(),
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      titleBarStyle: "hidden",
    });

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
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.focus();
      } else {
        this.mainWindow.show();
      }
    } else {
      this.createMainWindow();
    }
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
          this.createScreenshotWindow(screenshotData);
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
        logger.debug("检查托盘可用性", {
          platform: process.platform,
          isAvailable,
        });
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

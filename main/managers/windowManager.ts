import {
  BrowserWindow,
  session,
  screen,
  ipcMain,
  desktopCapturer,
} from "electron";
import path from "node:path";
import type { ScreenSource } from "../types";
import { ScreenshotService } from "../services/screenshotService";
import { createModuleLogger } from "../utils/logger";

// 创建WindowManager日志器
const logger = createModuleLogger('WindowManager');

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

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

      const iconPath = path.join(__dirname, "./static/icons8-camera-256.ico");
      logger.debug("图标路径", { iconPath });

      this.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        titleBarStyle: "hidden",
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, "./preload.js"),
          nodeIntegration: false,
          contextIsolation: true,
        },
        icon: iconPath,
      });

      logger.debug("主窗口创建成功", { preloadPath: path.join(__dirname, "./preload.js") });

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
        logger.warn("显示媒体请求处理器设置失败", { error: mediaError.message });
      }

      // 加载页面
      try {
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          logger.debug("加载开发服务器URL", { url: MAIN_WINDOW_VITE_DEV_SERVER_URL });
          this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
          const htmlPath = path.join(__dirname, `../renderer/index.html`);
          logger.debug("加载HTML文件", { htmlPath });
          this.mainWindow.loadFile(htmlPath);
        }
      } catch (loadError) {
        logger.error("页面加载失败", { error: loadError.message, stack: loadError.stack });
        throw loadError;
      }

      // 设置开发者工具快捷键
      this.mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.mainWindow?.webContents.openDevTools();
        }
      });

      logger.info("主窗口创建完成");
      return this.mainWindow;
    } catch (error) {
      logger.error("创建主窗口失败", { error: error.message, stack: error.stack });
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
      webPreferences: {
        preload: path.join(__dirname, "./preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`;
      // this.screenshotWindow.webContents.openDevTools()
      logger.debug("预热加载URL", { url });
      this.screenshotWindow.loadURL(url);
    } else {
      this.screenshotWindow.loadFile(
        path.join(__dirname, `../renderer/index.html`),
        {
          hash: "/screenshot",
        }
      );
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
    if(this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
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
      webPreferences: {
        preload: path.join(__dirname, "./preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      titleBarStyle: "hidden",
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.resultWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/result`);
    } else {
      this.resultWindow.loadFile(
        path.join(__dirname, `../renderer/index.html`),
        {
          hash: "/result",
        }
      );
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
    // 如果已有HTML查看器窗口，先关闭
    if (this.htmlViewerWindow) {
      this.htmlViewerWindow.close();
      this.htmlViewerWindow.destroy();
    }

    this.htmlViewerWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 600,
      minHeight: 400,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
      frame: true,
      titleBarStyle: "default",
      title: title,
      show: false,
    });

    // 创建HTML页面内容
    const htmlPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        * {
            box-sizing: border-box;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            background-color: #fff;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #e1e4e8;
            padding: 12px 16px;
            text-align: left;
        }
        th {
            background-color: #f6f8fa;
            font-weight: 600;
            color: #24292e;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #e1e4e8;
            margin: 16px 0;
        }
        code {
            background-color: #f6f8fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.9em;
            border: 1px solid #e1e4e8;
        }
        pre code {
            background: none;
            padding: 0;
            border: none;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #e1e4e8;
            padding-bottom: 10px;
        }
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #e1e4e8;
            padding-bottom: 8px;
        }
        ul, ol {
            padding-left: 24px;
            margin: 16px 0;
        }
        li {
            margin: 4px 0;
        }
        blockquote {
            margin: 16px 0;
            padding: 0 16px;
            color: #6a737d;
            border-left: 4px solid #dfe2e5;
            background-color: #f6f8fa;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .content {
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            ${htmlContent}
        </div>
    </div>
</body>
</html>`;
    // 加载HTML内容
    this.htmlViewerWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        htmlContent.replace(/```html/g, "").replace(/```/g, "")
      )}`
    );

    this.htmlViewerWindow.once("ready-to-show", () => {
      if (this.htmlViewerWindow && !this.htmlViewerWindow.isDestroyed()) {
        this.htmlViewerWindow.show();
        this.htmlViewerWindow.focus();
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
        logger.error("打开结果窗口失败", { error: error instanceof Error ? error.message : "未知错误" });
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
          logger.error("创建截图窗口失败", { error: error instanceof Error ? error.message : "未知错误" });
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
        const isAvailable = process.platform === 'win32' || process.platform === 'linux' || process.platform === 'darwin';
        logger.debug("检查托盘可用性", { platform: process.platform, isAvailable });
        return isAvailable;
      } catch (error) {
        logger.error("检查托盘可用性失败", { error: error instanceof Error ? error.message : "未知错误" });
        return false;
      }
    });

    // HTML查看器窗口
    ipcMain.handle(
      "open-html-viewer",
      async (_event, htmlContent: string, title?: string) => {
        try {
          logger.debug("打开HTML查看器", { contentLength: htmlContent?.length, title });
          this.createHtmlViewerWindow(htmlContent, title);
          return { success: true };
        } catch (error) {
          logger.error("创建HTML查看器窗口失败", { error: error instanceof Error ? error.message : "未知错误" });
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );
  }
}

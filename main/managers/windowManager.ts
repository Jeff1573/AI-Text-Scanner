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
      console.log("[WindowManager] 开始创建主窗口...");

      const iconPath = path.join(__dirname, "./static/icons8-camera-256.ico");
      console.log("[WindowManager] 图标路径:", iconPath);

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

      console.log(
        "[WindowManager] 主窗口创建成功，preload路径:",
        path.join(__dirname, "./preload.js")
      );

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
        console.log("[WindowManager] 显示媒体请求处理器设置成功");
      } catch (mediaError) {
        console.warn("[WindowManager] 显示媒体请求处理器设置失败:", mediaError);
      }

      // 加载页面
      try {
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          console.log(
            "[WindowManager] 加载开发服务器URL:",
            MAIN_WINDOW_VITE_DEV_SERVER_URL
          );
          this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
          const htmlPath = path.join(__dirname, `../renderer/index.html`);
          console.log("[WindowManager] 加载HTML文件:", htmlPath);
          this.mainWindow.loadFile(htmlPath);
        }
      } catch (loadError) {
        console.error("[WindowManager] 页面加载失败:", loadError);
        throw loadError;
      }

      // 设置开发者工具快捷键
      this.mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.mainWindow?.webContents.openDevTools();
        }
      });

      console.log("[WindowManager] 主窗口创建完成");
      return this.mainWindow;
    } catch (error) {
      console.error("[WindowManager] 创建主窗口失败:", error);
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
      this.screenshotWindow.webContents.openDevTools()
      console.log("预热加载URL:", url);
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
        console.error("窗口加载失败:", errorCode, errorDescription);
      }
    );

    this.screenshotWindow.on("closed", () => {
      this.screenshotWindow = null;
    });

    return this.screenshotWindow;
  }

  createScreenshotWindow(screenshotData: ScreenSource): void {
    if(this.mainWindow) {
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
      console.log("==========result window loaded==========");

      if (this.resultWindow) {
        const dataToSend =
          typeof resultContent === "string"
            ? JSON.stringify({ original: resultContent })
            : resultContent;
        this.resultWindow.webContents.send("result-data", dataToSend);
      }
      console.log("=======================================");
    });

    this.resultWindow.on("closed", () => {
      console.log("result window closed");
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
      console.log("HTML viewer window closed");
      this.htmlViewerWindow = null;
    });

    // 开发者工具快捷键
    this.htmlViewerWindow.webContents.on(
      "before-input-event",
      (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.htmlViewerWindow?.webContents.openDevTools();
        }
      }
    );
  }

  async hideAllWindows(): Promise<void> {
    if (this.mainWindow) {
      this.mainWindow.hide();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  showMainWindow(): void {
    if (this.mainWindow) {
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
        console.log("open-result-window", resultContent);
        this.createResultWindow(resultContent);
        return { success: true };
      } catch (error) {
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

        if (this.mainWindow) {
          this.mainWindow.show();
        }

        return result;
      } catch (error) {
        if (this.mainWindow) {
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
          console.log("received create screenshot window request, data:");
          this.createScreenshotWindow(screenshotData);
          return { success: true };
        } catch (error) {
          console.error("创建截图窗口失败:", error);
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
      return true;
    });

    // HTML查看器窗口
    ipcMain.handle(
      "open-html-viewer",
      async (_event, htmlContent: string, title?: string) => {
        try {
          console.log("open-html-viewer", {
            contentLength: htmlContent?.length,
            title,
          });
          this.createHtmlViewerWindow(htmlContent, title);
          return { success: true };
        } catch (error) {
          console.error("创建HTML查看器窗口失败:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );
  }
}

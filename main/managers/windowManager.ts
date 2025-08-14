import { BrowserWindow, session, screen, ipcMain, desktopCapturer } from "electron";
import path from "node:path";
import type { ScreenSource } from "../types";
import { ScreenshotService } from "../services/screenshotService";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private screenshotWindow: BrowserWindow | null = null;
  private resultWindow: BrowserWindow | null = null;

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getScreenshotWindow(): BrowserWindow | null {
    return this.screenshotWindow;
  }

  getResultWindow(): BrowserWindow | null {
    return this.resultWindow;
  }

  createMainWindow(): BrowserWindow | null {
    try {
      console.log('[WindowManager] 开始创建主窗口...');
      
      const iconPath = path.join(__dirname, "./static/icons8-camera-256.ico");
      console.log('[WindowManager] 图标路径:', iconPath);
      
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
      
      console.log('[WindowManager] 主窗口创建成功，preload路径:', path.join(__dirname, "./preload.js"));

      // 设置显示媒体请求处理器
      try {
        session.defaultSession.setDisplayMediaRequestHandler(
          (request, callback) => {
            desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
              callback({ video: sources[0] });
            });
          },
          { useSystemPicker: true }
        );
        console.log('[WindowManager] 显示媒体请求处理器设置成功');
      } catch (mediaError) {
        console.warn('[WindowManager] 显示媒体请求处理器设置失败:', mediaError);
      }

      // 加载页面
      try {
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          console.log('[WindowManager] 加载开发服务器URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
          this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
          const htmlPath = path.join(__dirname, `../renderer/index.html`);
          console.log('[WindowManager] 加载HTML文件:', htmlPath);
          this.mainWindow.loadFile(htmlPath);
        }
      } catch (loadError) {
        console.error('[WindowManager] 页面加载失败:', loadError);
        throw loadError;
      }

      // 设置开发者工具快捷键
      this.mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
          event.preventDefault();
          this.mainWindow?.webContents.openDevTools();
        }
      });

      console.log('[WindowManager] 主窗口创建完成');
      return this.mainWindow;
    } catch (error) {
      console.error('[WindowManager] 创建主窗口失败:', error);
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
        backgroundThrottling: false,
      },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`;
      console.log("预热加载URL:", url);
      this.screenshotWindow.loadURL(url);
    } else {
      this.screenshotWindow.loadFile(path.join(__dirname, `../renderer/index.html`), {
        hash: "/screenshot",
      });
    }

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
      (event, errorCode, errorDescription) => {
        console.error("窗口加载失败:", errorCode, errorDescription);
      }
    );
    
    this.screenshotWindow.on("closed", () => {
      this.screenshotWindow = null;
    });

    return this.screenshotWindow;
  }

  createScreenshotWindow(screenshotData: ScreenSource): void {
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
      this.resultWindow.loadFile(path.join(__dirname, `../renderer/index.html`), {
        hash: "/result",
      });
    }

    this.resultWindow.webContents.on("did-finish-load", () => {
      setTimeout(() => {
        if (this.resultWindow && !this.resultWindow.isDestroyed()) {
          this.resultWindow.webContents.send("result-data", resultContent);
        }
      }, 300);
    });

    this.resultWindow.on("closed", () => {
      this.resultWindow = null;
    });
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
    ipcMain.handle("open-result-window", async (event, resultContent) => {
      try {
        this.createResultWindow(resultContent);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "未知错误" 
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

    ipcMain.handle("create-screenshot-window", async (event, screenshotData) => {
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
  }
}
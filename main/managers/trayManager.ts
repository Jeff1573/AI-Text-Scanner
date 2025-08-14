import { Tray, Menu, nativeImage, clipboard, app } from "electron";
import path from "node:path";
import type { WindowManager } from "./windowManager";
import type { ConfigManager } from "./configManager";
import type { HotkeyConfig } from "../types";
import { ScreenshotService } from "../services/screenshotService";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private windowManager: WindowManager,
    private configManager: ConfigManager
  ) {}

  createTray(): void {
    const cfg = this.configManager.getLatestConfigWithDefaults();
    const hotkeys: HotkeyConfig = {
      resultHotkey: cfg.resultHotkey || "CommandOrControl+Shift+T",
      screenshotHotkey: cfg.screenshotHotkey || "CommandOrControl+Shift+S",
    };

    const iconPath = path.join(__dirname, "./static/icons8-camera-256.ico");

    console.log("iconPath", __dirname, iconPath);
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip("AI Text Scanner - AI文字识别工具");

    this.updateTrayMenu(hotkeys);
    this.setupTrayEvents();
  }

  updateTrayMenu(hotkeys: HotkeyConfig): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "显示主窗口",
        click: () => {
          this.windowManager.showMainWindow();
        },
      },
      {
        label: "截图识别",
        accelerator: hotkeys.screenshotHotkey.replace(
          "CommandOrControl",
          "CmdOrCtrl"
        ),
        click: async () => {
          try {
            await this.windowManager.hideAllWindows();
            const screenshotData = await ScreenshotService.captureScreen();

            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.show();
              mainWindow.setAlwaysOnTop(true);
              mainWindow.maximize();
              mainWindow.webContents.send(
                "open-screenshot-viewer",
                screenshotData
              );
            }
          } catch (error) {
            console.error("截图过程中发生错误:", error);
            this.windowManager.showMainWindow();
          }
        },
      },
      {
        label: "快捷翻译",
        accelerator: hotkeys.resultHotkey.replace(
          "CommandOrControl",
          "CmdOrCtrl"
        ),
        click: () => {
          console.log("托盘菜单快捷翻译被点击");
          const clipboardText = clipboard.readText();
          const defaultContent = clipboardText
            ? JSON.stringify({ original: clipboardText, translated: "" })
            : '{"original": "", "translated": ""}';
          this.windowManager.createResultWindow(defaultContent);
        },
      },
      { type: "separator" },
      {
        label: "设置",
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (!mainWindow) {
            this.windowManager.createMainWindow();
          }
          const currentMainWindow = this.windowManager.getMainWindow();
          if (currentMainWindow && !currentMainWindow.isDestroyed()) {
            currentMainWindow.webContents.send("open-settings-page");
          }
        },
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private setupTrayEvents(): void {
    if (!this.tray) return;

    this.tray.on("click", () => {
      this.windowManager.showMainWindow();
    });

    this.tray.on("double-click", () => {
      this.windowManager.showMainWindow();
    });
  }

  destroyTray(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  recreateTray(): void {
    this.destroyTray();
    this.createTray();
  }

  getTray(): Tray | null {
    return this.tray;
  }
}
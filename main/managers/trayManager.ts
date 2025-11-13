import { Tray, Menu, nativeImage, clipboard, app } from "electron";
import type { WindowManager } from "./windowManager";
import type { ConfigManager } from "./configManager";
import type { HotkeyConfig } from "../types";
import { ScreenshotService } from "../services/screenshotService";
import { createModuleLogger } from "../utils/logger";
import { getTrayIconPath } from "../utils/iconUtils";

const logger = createModuleLogger('TrayManager');


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

    const iconPath = getTrayIconPath();

    logger.debug("托盘图标路径", {
      __dirname,
      iconPath,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      cwd: process.cwd()
    });
    const icon = nativeImage.createFromPath(iconPath);

    // 检查图标是否成功加载
    if (icon.isEmpty()) {
      logger.error("托盘图标加载失败", { iconPath });
    } else {
      logger.info("托盘图标加载成功", {
        iconPath,
        size: icon.getSize()
      });
    }

    // macOS 上不使用 Template Image 以保持彩色图标
    // 使用足够大的原始图标（64px 或 128px），让系统自动缩放
    // 这样可以避免手动 resize 导致的模糊问题
    if (process.platform === "darwin" && !icon.isEmpty()) {
      // 不设置 templateImage，保持彩色
      // 系统会自动将图标缩放到合适的托盘尺寸（16x16@1x 或 32x32@2x）
    }

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
            await this.windowManager.createScreenshotWindow(screenshotData);
          } catch (error) {
            logger.error("截图过程中发生错误", { error });
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
          logger.info("托盘菜单快捷翻译被点击");
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
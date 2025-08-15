import { globalShortcut, clipboard } from "electron";
import type { WindowManager } from "./windowManager";
import type { ConfigManager } from "./configManager";
import type { HotkeyConfig, HotkeyStatus } from "../types";
import { ScreenshotService } from "../services/screenshotService";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('HotkeyManager');

export class HotkeyManager {
  private currentHotkeys: HotkeyConfig = {
    resultHotkey: "CommandOrControl+Shift+T",
    screenshotHotkey: "CommandOrControl+Shift+S",
  };

  private readonly DEFAULT_HOTKEYS: HotkeyConfig = { ...this.currentHotkeys };

  constructor(
    private windowManager: WindowManager,
    private configManager: ConfigManager
  ) {}

  registerGlobalShortcuts(hotkeys: HotkeyConfig): HotkeyStatus {
    globalShortcut.unregisterAll();
    this.currentHotkeys = hotkeys;

    const { resultHotkey, screenshotHotkey } = hotkeys;

    const ret1 = globalShortcut.register(resultHotkey, () => {
      logger.info("全局快捷键被触发，准备直接打开结果窗口");

      const clipboardText = clipboard.readText();
      const defaultContent = clipboardText
        ? JSON.stringify({ original: clipboardText, translated: "" })
        : '{"original": "", "translated": ""}';

      this.windowManager.createResultWindow(defaultContent);
    });

    const ret2 = globalShortcut.register(screenshotHotkey, async () => {
      logger.info("全局快捷键被触发，准备启动截图功能");

      try {
        await this.windowManager.hideAllWindows();
        const screenshotData = await ScreenshotService.captureScreen();
        this.windowManager.createScreenshotWindow(screenshotData);
      } catch (error) {
        logger.error("截图过程中发生错误", { error });
        this.windowManager.showMainWindow();
      }
    });

    if (!ret1) {
      logger.warn("ResultPage全局快捷键注册失败");
    } else {
      logger.info("ResultPage全局快捷键注册成功", { hotkey: resultHotkey });
    }

    if (!ret2) {
      logger.warn("ScreenshotViewer全局快捷键注册失败");
    } else {
      logger.info("ScreenshotViewer全局快捷键注册成功", { hotkey: screenshotHotkey });
    }

    return { resultRegistered: !!ret1, screenshotRegistered: !!ret2 };
  }

  unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll();
  }

  applyHotkeysFromConfig(): { hotkeys: HotkeyConfig; status: HotkeyStatus } {
    const cfg = this.configManager.getLatestConfigWithDefaults();
    const hotkeys: HotkeyConfig = {
      resultHotkey: cfg.resultHotkey || this.DEFAULT_HOTKEYS.resultHotkey,
      screenshotHotkey: cfg.screenshotHotkey || this.DEFAULT_HOTKEYS.screenshotHotkey,
    };
    
    const status = this.registerGlobalShortcuts(hotkeys);
    return { hotkeys, status };
  }

  getCurrentHotkeys(): HotkeyConfig {
    return { ...this.currentHotkeys };
  }

  getDefaultHotkeys(): HotkeyConfig {
    return { ...this.DEFAULT_HOTKEYS };
  }
}
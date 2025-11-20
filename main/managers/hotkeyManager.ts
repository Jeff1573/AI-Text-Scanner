import { globalShortcut, clipboard } from "electron";
import type { WindowManager } from "./windowManager";
import type { ConfigManager } from "./configManager";
import type { HotkeyConfig, HotkeyStatus } from "../types";
import { ScreenshotService } from "../services/screenshotService";
import { NativeScreenshotService } from "../services/nativeScreenshotService";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('HotkeyManager');

export class HotkeyManager {
  private currentHotkeys: HotkeyConfig = {
    resultHotkey: "CommandOrControl+Shift+T",
    screenshotHotkey: "CommandOrControl+Shift+S",
  };

  private readonly DEFAULT_HOTKEYS: HotkeyConfig = { ...this.currentHotkeys };
  
  // 截图防抖相关属性
  private _lastScreenshotTime = 0; // 记录上次截图的时间戳
  private _screenshotDebounceMs = 500; // 截图防抖时间间隔（毫秒）
  private _isScreenshotInProgress = false; // 标记是否有截图流程正在进行中

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
      const defaultContent = clipboardText ? clipboardText : "";

      this.windowManager.createResultWindow(defaultContent);
    });

    const ret2 = globalShortcut.register(screenshotHotkey, async () => {
      logger.info("全局快捷键被触发，准备启动截图功能", {
        platform: process.platform
      });

      try {
        // 检查是否有截图流程正在进行中
        if (this._isScreenshotInProgress) {
          logger.warn("截图流程正在进行中，已拒绝新的调用");
          return;
        }
        
        // 防抖检查：限制短时间内多次调用
        const now = Date.now();
        const timeSinceLastScreenshot = now - this._lastScreenshotTime;
        
        if (timeSinceLastScreenshot < this._screenshotDebounceMs) {
          const remainingTime = Math.ceil((this._screenshotDebounceMs - timeSinceLastScreenshot) / 1000);
          logger.warn("截图调用过于频繁，已拒绝", {
            timeSinceLastScreenshot,
            debounceMs: this._screenshotDebounceMs,
            remainingSeconds: remainingTime
          });
          return;
        }
        
        // 标记截图流程开始
        this._isScreenshotInProgress = true;
        // 更新上次截图时间
        this._lastScreenshotTime = now;
        
        await this.windowManager.hideAllWindows();

        // 所有平台统一：获取截图图片 dataURL 后，打开截图预览窗口
        if (process.platform === "darwin" || process.platform === "win32") {
          // macOS/Windows: 使用原生截图工具
          logger.info("使用系统原生截图工具");
          const filepath = await NativeScreenshotService.captureInteractive();
          const dataURL = await NativeScreenshotService.readScreenshotAsDataURL(filepath);
          NativeScreenshotService.cleanupScreenshot(filepath);

          await this.windowManager.createScreenshotPreviewWindow(dataURL);
        } else {
          // 其他平台: 使用 Electron desktopCapturer
          logger.info("使用 Electron desktopCapturer 截图");
          const screenshotData = await ScreenshotService.captureScreen();

          await this.windowManager.createScreenshotPreviewWindow(
            screenshotData.thumbnail
          );
        }
        
        // 截图流程成功完成，重置状态
        this._isScreenshotInProgress = false;
      } catch (error) {
        const err = error as Error;
        
        // 截图流程失败，重置状态
        this._isScreenshotInProgress = false;
        
        if (err.message.includes("取消") || err.message.includes("超时")) {
          logger.info("用户取消了截图或超时");
        } else {
          logger.error("截图过程中发生错误", { error: err.message });
        }
        this.windowManager.showMainWindow();
      }
    });

    if (!ret1) {
      logger.warn("ResultPage全局快捷键注册失败");
    } else {
      logger.info("ResultPage全局快捷键注册成功", { hotkey: resultHotkey });
    }

    if (!ret2) {
      logger.warn("截图预览窗口全局快捷键注册失败");
    } else {
      logger.info("截图预览窗口全局快捷键注册成功", { hotkey: screenshotHotkey });
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

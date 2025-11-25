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
  private _screenshotTimeoutMs = 30000; // 截图超时时间（30秒）
  private _screenshotTimeoutTimer: NodeJS.Timeout | null = null; // 截图超时定时器

  constructor(
    private windowManager: WindowManager,
    private configManager: ConfigManager
  ) {}

  /**
   * 启动截图超时保护定时器
   * 如果截图流程超过指定时间未完成，自动重置状态
   */
  private startScreenshotTimeout(): void {
    // 清除旧的定时器
    this.clearScreenshotTimeout();

    // 设置新的超时定时器
    this._screenshotTimeoutTimer = setTimeout(() => {
      if (this._isScreenshotInProgress) {
        logger.warn("截图流程超时，自动重置状态", {
          timeoutMs: this._screenshotTimeoutMs
        });
        this._isScreenshotInProgress = false;
      }
    }, this._screenshotTimeoutMs);
  }

  /**
   * 清除截图超时保护定时器
   */
  private clearScreenshotTimeout(): void {
    if (this._screenshotTimeoutTimer) {
      clearTimeout(this._screenshotTimeoutTimer);
      this._screenshotTimeoutTimer = null;
    }
  }

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

      // 检查是否有截图流程正在进行中
      if (this._isScreenshotInProgress) {
        logger.warn("检测到上一次截图仍在进行中，尝试取消并重新开始");
        // 取消当前的截图等待（如果是 Windows 平台）
        NativeScreenshotService.cancelCurrentCapture();
        // 清除之前的超时定时器
        this.clearScreenshotTimeout();
        // 重置状态，允许新的截图开始
        this._isScreenshotInProgress = false;
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
      // 启动超时保护
      this.startScreenshotTimeout();

      try {
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
      } catch (error) {
        const err = error as Error;

        if (err.message.includes("取消")) {
          // 用户主动取消截图，不显示主窗口
          logger.info("用户取消了截图");
        } else if (err.message.includes("超时")) {
          // 截图超时，显示主窗口并提示用户
          logger.warn("截图超时");
          this.windowManager.showMainWindow();
        } else {
          // 其他错误，显示主窗口以便用户了解情况
          logger.error("截图过程中发生错误", { error: err.message });
          this.windowManager.showMainWindow();
        }
      } finally {
        // 无论成功、失败还是异常，都确保重置截图状态和清除定时器
        this.clearScreenshotTimeout();
        this._isScreenshotInProgress = false;
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

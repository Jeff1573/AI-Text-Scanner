// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// 简化的日志函数，避免复杂的依赖
const logger = {
  debug: (message: string, meta?: any) =>
    console.debug(`[Preload] ${message}`, meta),
  error: (message: string, meta?: any) =>
    console.error(`[Preload] ${message}`, meta),
  info: (message: string, meta?: any) =>
    console.info(`[Preload] ${message}`, meta),
  warn: (message: string, meta?: any) =>
    console.warn(`[Preload] ${message}`, meta),
};

// 类型定义

interface SettingsConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  // 新增：全局快捷键配置
  resultHotkey: string;
  screenshotHotkey: string;
  // 新增：开机自启配置
  autoLaunch: boolean;
}

interface ImageAnalysisRequest {
  imageData: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 获取屏幕截图（使用 Electron desktopCapturer）
  captureScreen: (options: Record<string, unknown> = {}) =>
    ipcRenderer.invoke("capture-screen", options),

  // 原生截图（使用 macOS screencapture 命令）
  captureScreenNative: () =>
    ipcRenderer.invoke("capture-screen-native"),

  // 创建截图展示窗口
  createScreenshotWindow: (screenshotData: {
    id: string;
    name: string;
    thumbnail: string;
  }) => ipcRenderer.invoke("create-screenshot-window", screenshotData),

  // 监听截图数据
  onScreenshotData: (
    callback: (data: { id: string; name: string; thumbnail: string }) => void
  ) => {
    logger.debug("注册截图数据监听器");
    ipcRenderer.on("screenshot-data", (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error("回调函数执行失败", { error });
      }
    });
  },

  // 通知主进程：截图图像已准备好首帧
  notifyScreenshotReady: () => {
    ipcRenderer.send("screenshot-image-ready");
  },

  // 移除截图数据监听器
  removeScreenshotDataListener: () => {
    ipcRenderer.removeAllListeners("screenshot-data");
  },

  // 监听截图窗口隐藏事件
  onScreenshotWindowHide: (callback: () => void) => {
    logger.debug("注册截图窗口隐藏监听器");
    ipcRenderer.on("screenshot-window-hide", () => {
      try {
        callback();
      } catch (error) {
        logger.error("截图窗口隐藏回调函数执行失败", { error });
      }
    });
  },

  // 移除截图窗口隐藏监听器
  removeScreenshotWindowHideListener: () => {
    ipcRenderer.removeAllListeners("screenshot-window-hide");
  },

  // 监听截图预览数据
  onScreenshotPreviewData: (callback: (data: string) => void) => {
    logger.debug("注册截图预览数据监听器");
    ipcRenderer.on("screenshot-preview-data", (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error("回调函数执行失败", { error });
      }
    });
  },

  // 移除截图预览数据监听器
  removeScreenshotPreviewDataListener: () => {
    ipcRenderer.removeAllListeners("screenshot-preview-data");
  },

  // 打开主窗口并导航到指定路由
  openMainWindowWithRoute: (route: string) =>
    ipcRenderer.invoke("open-main-window-with-route", route),

  // 监听导航事件
  onNavigateTo: (callback: (event: any, route: string) => void) => {
    logger.debug("注册导航监听器");
    ipcRenderer.on("navigate-to", callback);
  },

  // 移除导航监听器
  removeNavigateToListener: () => {
    ipcRenderer.removeAllListeners("navigate-to");
  },

  // 保存配置
  saveConfig: (config: SettingsConfig) =>
    ipcRenderer.invoke("save-config", config),

  // 加载配置
  loadConfig: () => ipcRenderer.invoke("load-config"),

  // 获取最新配置
  getLatestConfig: (withDefaults = false) =>
    ipcRenderer.invoke("get-latest-config", withDefaults),

  // 获取配置（兼容性API）
  getConfig: () => ipcRenderer.invoke("load-config"),

  // 分析图片
  analyzeImage: (request: ImageAnalysisRequest) =>
    ipcRenderer.invoke("analyze-image", request),

  // 验证API配置
  validateApiConfig: () => ipcRenderer.invoke("validate-api-config"),

  // 获取可用的模型列表
  getModels: () => ipcRenderer.invoke("get-models"),

  // 翻译文本
  translate: (request: TranslateRequest) =>
    ipcRenderer.invoke("translate-text", request),

  // 窗口控制功能
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowHide: () => ipcRenderer.invoke("window-hide"),
  // 关闭截图窗口而不显示主窗口（用于复制操作后关闭）
  closeScreenshotWindowWithoutShowingMain: () => 
    ipcRenderer.invoke("close-screenshot-window-without-showing-main"),
  
  // 获取平台信息
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // 新增：打开结果窗口
  openResultWindow: (resultContent: string) =>
    ipcRenderer.invoke("open-result-window", resultContent),
  // 新增：监听结果窗口数据
  onResultData: (callback: (data: string) => void) => {
    ipcRenderer.on("result-data", (event, data) => callback(data));
  },
  // 新增：移除结果窗口数据监听
  removeResultDataListener: () => {
    ipcRenderer.removeAllListeners("result-data");
  },
  // 新增：获取剪贴板内容
  getClipboardText: () => ipcRenderer.invoke("get-clipboard-text"),

  // 新增：监听打开ResultPage事件
  onOpenResultPage: (callback: () => void) => {
    ipcRenderer.on("open-result-page", () => {
      try {
        callback();
      } catch (error) {
        logger.error("打开ResultPage回调函数执行失败", { error });
      }
    });
  },

  // 新增：移除打开ResultPage事件监听
  removeOpenResultPageListener: () => {
    ipcRenderer.removeAllListeners("open-result-page");
  },

  // 新增：监听打开ScreenshotViewer事件
  onOpenScreenshotViewer: (
    callback: (data: { id: string; name: string; thumbnail: string }) => void
  ) => {
    ipcRenderer.on("open-screenshot-viewer", (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error("打开ScreenshotViewer回调函数执行失败", { error });
      }
    });
  },

  // 新增：移除打开ScreenshotViewer事件监听
  removeOpenScreenshotViewerListener: () => {
    ipcRenderer.removeAllListeners("open-screenshot-viewer");
  },

  // 托盘相关API
  hideToTray: () => ipcRenderer.invoke("hide-to-tray"),
  showFromTray: () => ipcRenderer.invoke("show-from-tray"),
  isTrayAvailable: () => ipcRenderer.invoke("is-tray-available"),

  // 监听打开设置页面事件
  onOpenSettingsPage: (callback: () => void) => {
    ipcRenderer.on("open-settings-page", () => {
      try {
        callback();
      } catch (error) {
        logger.error("打开设置页面回调函数执行失败", { error });
      }
    });
  },

  // 移除打开设置页面事件监听
  removeOpenSettingsPageListener: () => {
    ipcRenderer.removeAllListeners("open-settings-page");
  },

  // 开机自启动 API
  getLoginItemSettings: () => ipcRenderer.invoke("get-login-item-settings"),
  setLoginItemSettings: (enable: boolean) =>
    ipcRenderer.invoke("set-login-item-settings", enable),
  validateAutoLaunch: () => ipcRenderer.invoke("validate-auto-launch"),
  getAutoLaunchDiagnostics: () =>
    ipcRenderer.invoke("get-auto-launch-diagnostics"),

  // HTML查看器窗口 API
  openHtmlViewer: (htmlContent: string, title?: string) =>
    ipcRenderer.invoke("open-html-viewer", htmlContent, title),

  // 获取应用版本
  getVersion: () => ipcRenderer.invoke("get-version"),
  
  // 打开外部链接（渲染进程不直接接触 shell.openExternal）
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  // 获取图片分析结果
  onImageAnalysisResult: (callback: (data: string) => void) => {
    ipcRenderer.on("image-analysis-result", (e, data) => {
      callback(data);
    });
  },
  
  // 更新相关API
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  getDownloadProgress: () => ipcRenderer.invoke("get-download-progress"),

  // 监听下载进度更新
  onDownloadProgress: (callback: (progress: {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  }) => void) => {
    // 先移除已有的监听器，避免重复注册
    ipcRenderer.removeAllListeners("download-progress-update");
    
    logger.info("注册下载进度监听器");
    ipcRenderer.on("download-progress-update", (e, progress) => {
      try {
        logger.debug("收到下载进度事件", { progress });
        callback(progress);
      } catch (error) {
        logger.error("下载进度回调函数执行失败", { error });
      }
    });
  },

  // 移除下载进度监听器
  removeDownloadProgressListener: () => {
    logger.info("移除下载进度监听器");
    ipcRenderer.removeAllListeners("download-progress-update");
  },

  // 监听更新可用通知
  onUpdateAvailableNotice: (callback: (data: {
    updateInfo: any;
    currentVersion: string;
    source: 'manual' | 'automatic';
    timestamp: number;
  }) => void) => {
    ipcRenderer.removeAllListeners('update-available-notification');

    logger.info('注册更新可用通知监听器');
    ipcRenderer.on('update-available-notification', (e, data) => {
      try {
        logger.info('收到更新可用通知事件', { source: data?.source });
        callback(data);
      } catch (error) {
        logger.error('更新可用通知回调执行失败', { error });
      }
    });
  },

  // 移除更新可用通知监听器
  removeUpdateAvailableNoticeListener: () => {
    logger.info('移除更新可用通知监听器');
    ipcRenderer.removeAllListeners('update-available-notification');
  },

  // 监听准备下载更新事件
  onPrepareDownloadUpdate: (callback: (data: {
    updateInfo: any;
    currentVersion: string;
  }) => void) => {
    // 先移除已有的监听器，避免重复注册
    ipcRenderer.removeAllListeners("prepare-download-update");
    
    logger.info("注册准备下载更新监听器");
    ipcRenderer.on("prepare-download-update", (e, data) => {
      try {
        logger.info("收到准备下载更新事件", { data });
        callback(data);
      } catch (error) {
        logger.error("准备下载更新回调函数执行失败", { error });
      }
    });
  },

  // 移除准备下载更新监听器
  removePrepareDownloadUpdateListener: () => {
    logger.info("移除准备下载更新监听器");
    ipcRenderer.removeAllListeners("prepare-download-update");
  },

  // 贴图窗口相关 API
  createStickerWindow: (imageData: string, width: number, height: number) =>
    ipcRenderer.invoke("create-sticker-window", imageData, width, height),

  closeStickerWindow: () => ipcRenderer.invoke("close-sticker-window"),

  // 监听贴图数据
  onStickerData: (callback: (data: { imageData: string; width: number; height: number }) => void) => {
    logger.debug("注册贴图数据监听器");
    ipcRenderer.on("sticker-data", (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error("贴图数据回调函数执行失败", { error });
      }
    });
  },

  // 移除贴图数据监听器
  removeStickerDataListener: () => {
    ipcRenderer.removeAllListeners("sticker-data");
  },

  // 调整贴图窗口大小
  resizeStickerWindow: (width: number, height: number) =>
    ipcRenderer.invoke("resize-sticker-window", width, height),

  // 监听贴图窗口滚轮事件
  onStickerWheel: (callback: (data: { deltaY: number }) => void) => {
    logger.debug("注册贴图滚轮事件监听器");
    ipcRenderer.on("sticker-wheel", (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error("贴图滚轮事件回调函数执行失败", { error });
      }
    });
  },

  // 缩放贴图窗口
  scaleStickerWindow: (deltaY: number) => ipcRenderer.invoke("scale-sticker-window", deltaY),

  // 重置贴图窗口大小
  resetStickerWindow: () => ipcRenderer.invoke("reset-sticker-window"),

});

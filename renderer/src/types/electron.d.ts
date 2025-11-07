// 统一的Electron API类型定义

// 下载进度接口
export interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

// 更新状态接口
export interface UpdateStatus {
  isChecking: boolean;
  updateAvailable: boolean;
  updateInfo: any;
  currentVersion: string;
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
}

export type UpdateNotificationSource = 'manual' | 'automatic';

export interface UpdateAvailableNotice {
  updateInfo: any;
  currentVersion: string;
  source: UpdateNotificationSource;
  timestamp: number;
}

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface APIConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  customModel?: string;
}

export interface ImageAnalysisRequest {
  imageData: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  targetLang?: string; // 目标语言，如果不提供则使用全局配置
}

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface OpenAIResponse {
  content: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ElectronAPI {
  captureScreen: (options?: Record<string, unknown>) => Promise<{
    success: boolean;
    sources?: Array<{
      id: string;
      name: string;
      thumbnail: string;
    }>;
    error?: string;
  }>;
  captureScreenNative: () => Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
  }>;
  createScreenshotWindow: (screenshotData: ScreenSource) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onScreenshotData: (callback: (data: ScreenSource) => void) => void;
  removeScreenshotDataListener: () => void;
  onScreenshotPreviewData: (callback: (data: string) => void) => void;
  removeScreenshotPreviewDataListener: () => void;
  openMainWindowWithRoute: (route: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateTo: (callback: (event: unknown, route: string) => void) => void;
  removeNavigateToListener: () => void;
  saveConfig: (config: { provider: string; apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  loadConfig: () => Promise<{
    success: boolean;
    config: { provider: string; apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string } | null;
    error?: string;
  }>;
  getLatestConfig: (withDefaults?: boolean) => Promise<{
    success: boolean;
    config: { provider: string; apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string; autoLaunch: boolean } | null;
    error?: string;
  }>;
  getConfig: () => Promise<{
    success: boolean;
    config: { provider: string; apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string; autoLaunch: boolean } | null;
    error?: string;
  }>;
  analyzeImage: (request: ImageAnalysisRequest) => Promise<OpenAIResponse>;
  validateApiConfig: () => Promise<{ success: boolean; error?: string }>;
  getModels: () => Promise<{ success: boolean; models: string[]; error?: string }>;
  translate: (request: TranslateRequest) => Promise<OpenAIResponse>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowHide: () => Promise<void>;
  // 关闭截图窗口而不显示主窗口（用于复制操作后关闭）
  closeScreenshotWindowWithoutShowingMain: () => Promise<void>;
  getPlatform: () => Promise<string>;
  openResultWindow: (resultContent: string) => Promise<{ success: boolean; error?: string }>;
  onResultData: (callback: (data: string) => void) => void;
  removeResultDataListener: () => void;
  onOpenResultPage: (callback: () => void) => void;
  getClipboardText: () => Promise<{ success: boolean; text: string; error?: string }>;
  removeOpenResultPageListener: () => void;
  onOpenScreenshotViewer: (callback: (data: ScreenSource) => void) => void;
  removeOpenScreenshotViewerListener: () => void;
  // 通知主进程：截图画面已渲染
  notifyScreenshotReady: () => void;
  // 托盘相关API
  hideToTray: () => Promise<void>;
  showFromTray: () => Promise<void>;
  isTrayAvailable: () => Promise<boolean>;
  onOpenSettingsPage: (callback: () => void) => void;
  removeOpenSettingsPageListener: () => void;
  // 开机自启动
  getLoginItemSettings: () => Promise<{ success: boolean; openAtLogin?: boolean; strategy?: string; path?: string; error?: string }>;
  setLoginItemSettings: (enable: boolean) => Promise<{ success: boolean; openAtLogin?: boolean; strategy?: string; path?: string; verified?: boolean; error?: string }>;
  validateAutoLaunch: () => Promise<{ success: boolean; isValid?: boolean; strategy?: string; path?: string; error?: string }>;
  getAutoLaunchDiagnostics: () => Promise<{ success: boolean; report?: string; error?: string }>;
  // HTML查看器窗口
  openHtmlViewer: (htmlContent: string, title?: string) => Promise<{ success: boolean; error?: string }>;
  // 获取应用版本
  getVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
  // 打开外部链接
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  // 获取图片分析结果
  onImageAnalysisResult: (callback: (data) => void) => void;
  // 更新相关API
  checkForUpdates: () => Promise<{ success: boolean; checking: boolean; updateAvailable?: boolean; updateInfo?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  getUpdateStatus: () => Promise<{ success: boolean; status?: UpdateStatus; error?: string }>;
  getDownloadProgress: () => Promise<{ success: boolean; progress?: DownloadProgress | null; error?: string }>;

  // 监听下载进度更新
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  removeDownloadProgressListener: () => void;
  onUpdateAvailableNotice: (callback: (data: UpdateAvailableNotice) => void) => void;
  removeUpdateAvailableNoticeListener: () => void;

  // 监听准备下载更新事件
  onPrepareDownloadUpdate: (callback: (data: {
    updateInfo: any;
    currentVersion: string;
  }) => void) => void;
  removePrepareDownloadUpdateListener: () => void;

}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

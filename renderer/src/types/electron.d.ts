// 统一的Electron API类型定义

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
  createScreenshotWindow: (screenshotData: ScreenSource) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onScreenshotData: (callback: (data: ScreenSource) => void) => void;
  removeScreenshotDataListener: () => void;
  saveConfig: (config: { apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  loadConfig: () => Promise<{
    success: boolean;
    config: { apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string } | null;
    error?: string;
  }>;
  getLatestConfig: (withDefaults?: boolean) => Promise<{
    success: boolean;
    config: { apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string; autoLaunch: boolean } | null;
    error?: string;
  }>;
  getConfig: () => Promise<{
    success: boolean;
    config: { apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string; resultHotkey: string; screenshotHotkey: string; autoLaunch: boolean } | null;
    error?: string;
  }>;
  analyzeImageOpenAI: (request: ImageAnalysisRequest) => Promise<OpenAIResponse>;
  validateOpenAIConfig: () => Promise<{ success: boolean; error?: string }>;
  getOpenAIModels: () => Promise<{ success: boolean; models: string[]; error?: string }>;
  translate: (request: TranslateRequest) => Promise<OpenAIResponse>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
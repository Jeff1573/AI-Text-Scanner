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
  prompt: string;
  maxTokens?: number;
  temperature?: number;
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
  saveConfig: (config: { apiUrl: string; apiKey: string; model: string; customModel: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  loadConfig: () => Promise<{
    success: boolean;
    config: { apiUrl: string; apiKey: string; model: string; customModel: string; sourceLang: string; targetLang: string } | null;
    error?: string;
  }>;
  analyzeImageOpenAI: (config: APIConfig, request: ImageAnalysisRequest) => Promise<OpenAIResponse>;
  validateOpenAIConfig: (config: APIConfig) => Promise<{ success: boolean; error?: string }>;
  getOpenAIModels: (config: APIConfig) => Promise<{ success: boolean; models: string[]; error?: string }>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  openResultWindow: (resultContent: string) => Promise<{ success: boolean; error?: string }>;
  onResultData: (callback: (data: string) => void) => void;
  removeResultDataListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 
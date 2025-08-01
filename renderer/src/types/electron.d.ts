// 统一的Electron API类型定义

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
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
    config: { apiUrl: string; apiKey: string; model: string; customModel: string } | null;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 
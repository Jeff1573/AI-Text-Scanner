// 主进程类型定义

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

// 屏幕源接口
export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

// 配置提供者接口
export interface ConfigProvider {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  // 新增：全局快捷键配置
  resultHotkey: string; // 打开结果窗口快捷键
  screenshotHotkey: string; // 截图识别快捷键
  // 新增：开机自启配置
  autoLaunch: boolean;
}

// 配置接口
export interface Config {
  provider: ConfigProvider[];
}

// 快捷键配置接口
export interface HotkeyConfig {
  resultHotkey: string;
  screenshotHotkey: string;
}

// 快捷键状态接口
export interface HotkeyStatus {
  resultRegistered: boolean;
  screenshotRegistered: boolean;
}

// 配置保存结果接口
export interface SaveResult {
  success: boolean;
  error?: string;
  hotkeyStatus?: HotkeyStatus;
  hotkeys?: HotkeyConfig;
}

 
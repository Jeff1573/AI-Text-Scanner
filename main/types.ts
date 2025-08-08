// 主进程类型定义

// 屏幕源接口
export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

// 配置提供者接口
export interface ConfigProvider {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  // 新增：全局快捷键配置
  resultHotkey: string; // 打开结果窗口快捷键
  screenshotHotkey: string; // 截图识别快捷键
}

// 配置接口
export interface Config {
  provider: ConfigProvider[];
} 
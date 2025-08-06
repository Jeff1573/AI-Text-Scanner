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
}

// 配置接口
export interface Config {
  provider: ConfigProvider[];
} 
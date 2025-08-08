// 设置相关类型定义

// 设置表单数据接口
export interface SettingsFormData {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string; // 原文语言
  targetLang: string; // 翻译语言
  // 新增：全局快捷键配置
  resultHotkey: string; // 打开结果窗口快捷键
  screenshotHotkey: string; // 截图识别快捷键
  autoLaunch: boolean; // 开机自启动
} 
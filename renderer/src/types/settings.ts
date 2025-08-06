// 设置相关类型定义

// 设置表单数据接口
export interface SettingsFormData {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string; // 原文语言
  targetLang: string; // 翻译语言
} 
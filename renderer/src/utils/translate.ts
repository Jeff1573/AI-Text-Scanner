import type { APIConfig } from "../types/electron";

interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export const translate = async (
  config: APIConfig,
  params: TranslateParams
): Promise<string> => {
  try {
    const result = await window.electronAPI.translate(config, params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.content;
  } catch (error) {
    console.error("翻译失败:", error);
    return "翻译时发生错误";
  }
};
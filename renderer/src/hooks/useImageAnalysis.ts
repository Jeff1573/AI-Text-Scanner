import { useState, useCallback } from "react";
import type { SettingsFormData } from "../types/settings";
import type {
  APIConfig,
  ImageAnalysisRequest,
  OpenAIResponse,
} from "../types/electron";

// 图片分析状态接口
export interface ImageAnalysisState {
  isAnalyzing: boolean;
  analysisResult: string;
  analysisError: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

// 图片分析Hook
export const useImageAnalysis = () => {
  const [state, setState] = useState<ImageAnalysisState>({
    isAnalyzing: false,
    analysisResult: "",
    analysisError: "",
    usage: null,
  });

  // 分析图片
  const analyzeImage = useCallback(
    async (
      config: SettingsFormData,
      imageData: string,
      prompt?: string
    ) => {
      const dynamicPrompt =
        prompt ||
        `1. 请分析图片内容，提取图片中的文本内容，严格按图片内容逐字输出原文（原文语言：${config.sourceLang}）。\n2. 将上述原文翻译为${config.targetLang}。\n3. 以如下JSON格式返回：{"original": 原文, "translated": 译文}。\n4. 只返回JSON，不要有多余内容。`;
      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        analysisResult: "",
        analysisError: "",
        usage: null,
      }));

      try {
        console.log("开始分析图片...");

        // 构建API配置
        const apiConfig: APIConfig = {
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.customModel || config.model,
        };

        // 构建请求参数
        const request: ImageAnalysisRequest = {
          imageData,
          prompt: dynamicPrompt,
          maxTokens: 1500,
          temperature: 0.3,
        };

        // 调用preload的API
        const result: OpenAIResponse =
          await window.electronAPI.analyzeImageOpenAI(apiConfig, request);

        console.log("result", result);

        if (result.error) {
          setState((prev) => ({
            ...prev,
            isAnalyzing: false,
            analysisError: result.error || "未知错误",
          }));
          console.error("图片分析失败:", result.error);
        } else {
          setState((prev) => ({
            ...prev,
            isAnalyzing: false,
            analysisResult: result.content,
            usage: result.usage || null,
          }));
          console.log("图片分析成功:", result.content);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "未知错误";
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          analysisError: errorMessage,
        }));
        console.error("图片分析异常:", error);
      }
    },
    []
  );

  // 清除分析结果
  const clearAnalysis = useCallback(() => {
    setState({
      isAnalyzing: false,
      analysisResult: "",
      analysisError: "",
      usage: null,
    });
  }, []);

  // 重置错误状态
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      analysisError: "",
    }));
  }, []);

  return {
    ...state,
    analyzeImage,
    clearAnalysis,
    clearError,
  };
};

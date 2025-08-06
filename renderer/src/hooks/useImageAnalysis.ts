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
      prompt = `
    1. Analyze the image and return the text content of the image, type the text according to the image content, obtain only the text, and do not have redundant content.
    2. Translate the returned content, Translate language to Simplified Chinese
    3. Put the identified original text and translated text into a json
    4. Just return this json
    `
    ) => {
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
          prompt,
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

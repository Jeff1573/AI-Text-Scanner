import { useState, useCallback } from "react";
import type {
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
    async (imageData: string, prompt?: string, targetLang?: string) => {
      const finalPrompt =
        prompt ||
        `请分析图片内容，提取图片中的文本内容，严格按图片内容逐字输出原文`;
      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        analysisResult: "",
        analysisError: "",
        usage: null,
      }));

      try {
        console.log("开始分析图片...");

        // 获取全局配置中的目标语言
        let finalTargetLang = targetLang;
        if (!finalTargetLang) {
          try {
            const configResult = await window.electronAPI.getLatestConfig(true);
            if (configResult.success && configResult.config) {
              finalTargetLang = configResult.config.targetLang;
              console.log("使用全局配置中的目标语言:", finalTargetLang);
            }
          } catch (error) {
            console.warn("获取全局配置失败，使用默认目标语言", error);
            finalTargetLang = "zh"; // 默认中文
          }
        }

        // 构建请求参数
        const request: ImageAnalysisRequest = {
          imageData,
          prompt: finalPrompt,
          temperature: 0.1,
          targetLang: finalTargetLang,
        };

        // 调用preload的API
        const result: OpenAIResponse =
          await window.electronAPI.analyzeImage(request);

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

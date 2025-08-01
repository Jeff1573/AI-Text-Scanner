import { useState, useCallback } from 'react';
import type { SettingsFormData } from '../types/settings';
import { sendImageToOpenAI, type OpenAIResponse } from '../utils/openaiApi';

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
    analysisResult: '',
    analysisError: '',
    usage: null
  });

  // 分析图片
  const analyzeImage = useCallback(async (
    config: SettingsFormData,
    imageData: string,
    prompt = '请分析这张截图的内容，包括文字、图像和布局信息'
  ) => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      analysisResult: '',
      analysisError: '',
      usage: null
    }));

    try {
      console.log('开始分析图片...');
      const result = await sendImageToOpenAI(config, {
        imageData,
        prompt,
        maxTokens: 1500,
        temperature: 0.3
      });
      console.log('result', result);

      if (result.error) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          analysisError: result.error || '未知错误'
        }));
        console.error('图片分析失败:', result.error);
      } else {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          analysisResult: result.content,
          usage: result.usage || null
        }));
        console.log('图片分析成功:', result.content);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: errorMessage
      }));
      console.error('图片分析异常:', error);
    }
  }, []);

  // 清除分析结果
  const clearAnalysis = useCallback(() => {
    setState({
      isAnalyzing: false,
      analysisResult: '',
      analysisError: '',
      usage: null
    });
  }, []);

  // 重置错误状态
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      analysisError: ''
    }));
  }, []);

  return {
    ...state,
    analyzeImage,
    clearAnalysis,
    clearError
  };
}; 
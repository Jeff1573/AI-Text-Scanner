import type { SettingsFormData } from '../types/settings';

// OpenAI API响应接口
export interface OpenAIResponse {
  content: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 图片分析请求参数
export interface ImageAnalysisRequest {
  imageData: string; // Base64图片数据
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 发送图片到OpenAI API进行分析
 * @param config - API配置信息
 * @param request - 图片分析请求参数
 * @returns Promise<OpenAIResponse>
 */
export async function sendImageToOpenAI(
  config: SettingsFormData,
  request: ImageAnalysisRequest
): Promise<OpenAIResponse> {
  try {
    // 验证配置
    if (!config.apiKey) {
      return { content: '', error: 'API密钥未配置' };
    }

    if (!config.apiUrl) {
      return { content: '', error: 'API地址未配置' };
    }

    // 构建请求URL
    const apiUrl = `${config.apiUrl}`;
    
    // 构建请求体
    const requestBody = {
      model: config.customModel || config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: request.prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${request.imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: request.maxTokens || 65536,
      temperature: request.temperature || 0.7
    };

    console.log('发送API请求:', {
      url: apiUrl,
      model: requestBody.model,
      prompt: request.prompt,
      maxTokens: requestBody.max_tokens
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API请求失败:', data);
      return { 
        content: '', 
        error: data.error?.message || `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    
    console.log('API响应成功:', {
      content: data.choices[0].message.content,
      usage: data.usage
    });

    return { 
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('API调用异常:', error);
    return { 
      content: '', 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
}

/**
 * 验证API配置是否有效
 * @param config - API配置信息
 * @returns Promise<boolean>
 */
export async function validateApiConfig(config: SettingsFormData): Promise<boolean> {
  try {
    if (!config.apiKey || !config.apiUrl) {
      return false;
    }

    // 发送一个简单的测试请求
    const testResponse = await fetch(`${config.apiUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    return testResponse.ok;
  } catch (error) {
    console.error('API配置验证失败:', error);
    return false;
  }
}

/**
 * 获取支持的模型列表
 * @param config - API配置信息
 * @returns Promise<string[]>
 */
export async function getAvailableModels(config: SettingsFormData): Promise<string[]> {
  try {
    if (!config.apiKey || !config.apiUrl) {
      return [];
    }

    const response = await fetch(`${config.apiUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.data
      .filter((model: any) => model.id.includes('gpt-4') || model.id.includes('gpt-3.5'))
      .map((model: any) => model.id);
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
} 
import OpenAI from "openai";

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

// API配置接口
export interface APIConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  customModel?: string;
}

/**
 * 使用OpenAI官方库发送图片分析请求
 * @param config - API配置信息
 * @param request - 图片分析请求参数
 * @returns Promise<OpenAIResponse>
 */
export async function analyzeImageWithOpenAI(
  config: APIConfig,
  request: ImageAnalysisRequest
): Promise<OpenAIResponse> {
  try {
    // 验证配置
    if (!config.apiKey) {
      return { content: "", error: "API密钥未配置" };
    }

    if (!config.apiUrl) {
      return { content: "", error: "API地址未配置" };
    }

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl, // 使用自定义API地址
    });

    console.log("发送OpenAI API请求:", {
      url: config.apiUrl,
      model: config.customModel || config.model,
      prompt: request.prompt,
      maxTokens: request.maxTokens || 10000,
    });

    // 构建请求体
    const requestBody = {
      model: config.customModel || config.model,
      messages: [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: request.prompt,
            },
            {
              type: "image_url" as const,
              image_url: {
                url: request.imageData,
              },
            },
          ],
        },
      ],
      max_tokens: request.maxTokens || 10000,
      temperature: request.temperature || 0.7,
    };

    // 发送请求
    const response = await openai.chat.completions.create(requestBody);

    console.log("OpenAI API响应成功:", {
      content: response.choices[0].message.content,
      usage: response.usage,
    });

    return {
      content: response.choices[0].message.content || "",
      usage: response.usage,
    };
  } catch (error) {
    console.error("OpenAI API调用异常:", error);

    // 处理不同类型的错误
    if (error instanceof OpenAI.APIError) {
      return {
        content: "",
        error: `API错误: ${error.message}`,
      };
    } else if (error instanceof OpenAI.APIConnectionError) {
      return {
        content: "",
        error: `连接错误: ${error.message}`,
      };
    } else if (
      // OpenAI.APITimeoutError 可能不存在，需用字符串判断类型
      error.name === "APITimeoutError" ||
      error.message?.includes("timeout")
    ) {
      return {
        content: "",
        error: `请求超时: ${error.message}`,
      };
    } else if (error instanceof OpenAI.RateLimitError) {
      return {
        content: "",
        error: `请求频率限制: ${error.message}`,
      };
    } else {
      return {
        content: "",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }
}

/**
 * 验证API配置是否有效
 * @param config - API配置信息
 * @returns Promise<boolean>
 */
export async function validateOpenAIConfig(
  config: APIConfig
): Promise<boolean> {
  try {
    if (!config.apiKey || !config.apiUrl) {
      return false;
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });

    // 发送一个简单的测试请求
    await openai.models.list();
    return true;
  } catch (error) {
    console.error("OpenAI API配置验证失败:", error);
    return false;
  }
}

/**
 * 获取支持的模型列表
 * @param config - API配置信息
 * @returns Promise<string[]>
 */
export async function getAvailableOpenAIModels(
  config: APIConfig
): Promise<string[]> {
  try {
    if (!config.apiKey || !config.apiUrl) {
      return [];
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });

    const response = await openai.models.list();

    return response.data
      .filter(
        (model) =>
          model.id.includes("gpt-4") ||
          model.id.includes("gpt-3.5") ||
          model.id.includes("gemini")
      )
      .map((model) => model.id);
  } catch (error) {
    console.error("获取OpenAI模型列表失败:", error);
    return [];
  }
}

// 翻译请求参数
export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

/**
 * 使用OpenAI API翻译文本
 * @param config - API配置信息
 * @param request - 翻译请求参数
 * @returns Promise<OpenAIResponse>
 */
export async function translateText(
  config: APIConfig,
  request: TranslateRequest
): Promise<OpenAIResponse> {
  try {
    if (!config.apiKey || !config.apiUrl) {
      return { content: "", error: "API密钥或地址未配置" };
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });

    console.log(`translate config`, config);
    console.log(`translate request`, request);
    const system_prompt = `你是一个多语言翻译机器人。用户会指定要翻译成什么语言，或者让你直接翻译。如果用户没有指定目标语言，就默认翻译成中文。只返回翻译结果。`;

    console.log("system_prompt", system_prompt);
    const response = await openai.chat.completions.create({
      model: config.customModel || config.model,
      messages: [
        { role: "system", content: system_prompt },
        {
          role: "user",
          content: `翻译成${request.targetLang}：${request.text}`,
        }
      ],
    });

    console.log(`translate response`, response.choices[0].message.content);
    return {
      content: response.choices[0].message.content || "",
    };
  } catch (error) {
    console.error("OpenAI翻译API调用异常:", error);
    return {
      content: "",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

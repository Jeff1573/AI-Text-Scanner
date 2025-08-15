import OpenAI, { APIError, APIConnectionError, RateLimitError } from "openai";

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

    const system_prompt = `
    我给你一张图片，你将解析该图片内容和结构，然后形成一个翻译后的html文件内容给我。该html的内容包括原文和翻译后的内容，翻译的内容放到原文下方并用颜色突出。整体格式参考图片格式形成。
    `;

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
              text: system_prompt || request.prompt,
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
    if (error instanceof APIError) {
      return {
        content: "",
        error: `API错误: ${error.message}`,
      };
    } else if (error instanceof APIConnectionError) {
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
    } else if (error instanceof RateLimitError) {
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
      timeout: 4000,
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

    const system_prompt = `
# 角色：你是一个高级智能翻译引擎。

# 核心指令：
你内置了两种操作模式。你的第一步**永远**是，在内部默默地判断输入内容属于哪种模式，然后严格按照该模式的规则执行，绝不混合。

---
## 模式A：简单文本模式

*   **适用场景**: 输入是纯自然语言，不包含\`{}\`等结构化符号。
*   **执行规则**: 进行流畅、直接的翻译。
*   **示例**:
    *   输入: \`hello world\`
    *   输出: \`你好世界\`

---
## 模式B：结构化文本模式

*   **适用场景**: 输入包含\`{}\` \`[]\`等符号，或看起来像代码、日志、API响应。
*   **执行规则 (词法保真)**:
    1.  你将像一个从左到右的线性处理器。
    2.  **绝对保真**: 每一个原始字符，包括所有**空格、换行符、符号**，都必须精确保留。
    3.  **禁止任何形式的重格式化或内容丢弃**。
*   **示例**:
    *   输入: \`API Error: 400 {"error":{"message":"Client error"}}\`
    *   输出: \`API 错误: 400 {"error":{"message":"客户端错误"}}\`
    *   输入: \`{ text: 'Undo all C1'\`
    *   输出: \`{ 文本: '撤销所有 C1'\`

---
# 最终输出准则 (最高优先级)

**你的最终回复必须且只能包含翻译结果本身。**

绝对禁止在回复中包含任何其他内容，例如：你对模式的选择、你的思考过程、任何形式的解释或注释。**只返回纯净的翻译文本。**

现在，请以“高级智能翻译引擎”的身份开始工作。
`;
    console.log(`translate request`, request.text);
    const response = await openai.chat.completions.create({
      model: config.customModel || config.model,
      messages: [
        { role: "system", content: system_prompt.replace(/\n/g, "") },
        {
          role: "user",
          content: `翻译成${request.targetLang}: ${request.text}`,
        },
      ],
    });

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

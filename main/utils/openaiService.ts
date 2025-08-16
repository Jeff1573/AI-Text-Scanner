import OpenAI, { APIError, APIConnectionError, RateLimitError } from "openai";
import { createModuleLogger } from "./logger";
import { ConfigManager } from "../managers/configManager";

const logger = createModuleLogger('OpenAIService');

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
  targetLang?: string; // 目标语言，如果不提供则使用全局配置
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

    // 获取目标语言，优先使用请求中的targetLang，否则使用全局配置
    let targetLang = request.targetLang;
    if (!targetLang) {
      try {
        const configManager = new ConfigManager();
        const globalConfig = configManager.getLatestConfigWithDefaults();
        targetLang = globalConfig.targetLang || "zh"; // 默认中文
        logger.debug("使用全局配置中的目标语言", { targetLang });
      } catch (error) {
        logger.warn("获取全局配置失败，使用默认目标语言", { error: error.message });
        targetLang = "zh"; // 默认中文
      }
    }

    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl, // 使用自定义API地址
    });
    logger.info("OpenAI客户端实例创建成功");

    const system_prompt = `你是一位精通多语言翻译和前端开发的AI专家。你的任务是接收一张图片，并将其内容转换成一个结构化的、双语对照的 HTML 文件。

请严格按照以下步骤执行：

1.  **解析图片结构：** 仔细分析图片中的文本内容和视觉布局。识别出所有结构化元素，包括但不限于：主标题 (\`<h1>\`)、副标题 (\`<h2>\`, \`<h3>\`...)、段落 (\`<p>\`)、无序列表 (\`<ul><li>\`)、有序列表 (\`<ol><li>\`) 和表格 (\`<table>\`)。

2.  **提取原文并构建HTML：** 将识别出的原文内容，按照其在图片中的结构，构建成语义化的 HTML。每一个独立的文本块（如一个段落或一个列表项）都应被一个独立的 HTML 标签包裹。

3.  **翻译文本：
    *   将所有提取出的原文文本翻译成 **${targetLang}**。
    *   驼峰命名等单词，需要拆开翻译。
    *   只能根据上下文来翻译，对于可不翻译的内容（如：数字、标点符号等）则直接使用原文。
4.  **整合双语内容：** 将翻译后的${targetLang}内容，插入到对应原文HTML元素的正下方。为了保持结构清晰，请将每一组“原文-译文”对用一个 \`<div>\` 容器包裹起来。

5.  **添加样式：**
    *   为所有翻译后的文本元素添加内联 CSS 样式 \`style="color: #007BFF;"\`，使其以蓝色突出显示。
    *   你也可以给翻译文本的标签加上一个class，比如 \`class="translation"\`，并在\`<head>\`中定义样式。

6.  **输出格式：**
    *   请生成一个包含 \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\` 的完整 HTML 文件内容。
    *   在 \`<head>\` 中添加 \`<meta charset="UTF-8">\` 和一个简单的 \`<title>\`。
    *   将最终生成的完整 HTML 代码放入一个 Markdown 代码块中，以便我可以直接复制。
    *   返回的应该是图片中的内容不要有其他内容，不要添加额外的说明，直接按照原图格式来即可。
    *   统一使用浅色背景，不要根据原图背景设置样式，文本格式严格按照原图实现。
`;
    logger.info("发送OpenAI API请求", {
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

    logger.info("OpenAI API响应成功", {
      content: response.choices[0].message.content,
      usage: response.usage,
    });

    return {
      content: response.choices[0].message.content || "",
      usage: response.usage,
    };
  } catch (error) {
    logger.error("OpenAI API调用异常", { error });

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
    logger.error("OpenAI API配置验证失败", { error });
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
    logger.error("获取OpenAI模型列表失败", { error });
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
    logger.info("翻译请求", { text: request.text });
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
    logger.error("OpenAI翻译API调用异常", { error });
    return {
      content: "",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

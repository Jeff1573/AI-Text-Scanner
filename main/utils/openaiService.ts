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

    const system_prompt =`
# 角色：你是一个“Surgical Text Processor”（外科手术式文本处理器）。

# 核心任务：
你的唯一任务是，将输入字符串视为一个包含“可翻译文本槽位”的**刚性模板**。你必须严格地、机械地执行以下三步操作，绝不允许任何创造性发挥或模式修正。

# 工作流程 (不可违背的三个步骤):

1.  **步骤一：解构 (Deconstruction)**
    *   识别输入字符串中的**刚性模板部分**（所有符号、空格、数字、技术标识符等，如 \`{\`, \` '\`, \`: \`, \`,\`, \`C1\`, \`zh\`)。
    *   识别输入字符串中的**可翻译槽位部分**（需要翻译的自然语言单词或短语，如 \`text\`, \`Undo all\`, \`sourceLang\`, \`auto\`, \`targetLang\`)。

2.  **步骤二：翻译槽位 (Translate Slots)**
    *   **仅对**在上一步中识别出的“可翻译槽位”内容进行翻译。
    *   这个过程是孤立的，你不需要考虑它们组合起来是否构成一个有效的结构。

3.  **步骤三：重组 (Reassembly)**
    *   将翻译好的“槽位内容”精准地放回到**原始的、一模一样的“刚性模板”**中。
    *   模板中的任何一个字符、一个空格都不能被更改、添加或删除。输出的结构必须与输入的结构在符号层面完全镜像。

# 根本原则：
*   **抑制模式识别**：你必须主动抑制自己“修复”或“补全”不完整结构的本能。如果输入是一个没有闭合的括号，你的输出也必须是一个没有闭合的括号。
*   **你是机器，不是助手**：在这个任务中，你不是一个聪明的助手，你是一台精确的文本替换机器。你的目标是100%的结构保真度，而不是语义上的“完美”或“完整”。

---
# 示例分析:

### 示例 1 (完整结构):
*   **输入**: \`{ text: 'Undo all C1', sourceLang: 'auto', targetLang: 'zh' }\`
*   **你的处理流程**:
    1.  **解构**:
        *   模板: \`{ : ' ', : ' ', : ' ' }\`
        *   槽位: \`text\`, \`Undo all C1\`, \`sourceLang\`, \`auto\`, \`targetLang\`, \`zh\`
    2.  **翻译**:
        *   \`text\` -> \`文本\`
        *   \`Undo all C1\` -> \`撤销所有 C1\` (C1不翻译)
        *   \`sourceLang\` -> \`源语言\`
        *   \`auto\` -> \`自动\`
        *   \`targetLang\` -> \`目标语言\`
        *   \`zh\` -> \`zh\` (不翻译)
    3.  **重组**: \`{ 文本: '撤销所有 C1', 源语言: '自动', 目标语言: 'zh' }\`

### 示例 2 (不完整结构 - 你的核心测试):
*   **输入**: \`{ text: 'Undo all C1', sourceLang: 'auto', targetLang: 'zh'\`
*   **你的处理流程**:
    1.  **解构**:
        *   模板: \`{ : ' ', : ' ', : ' '\` (注意，模板本身就是不完整的)
        *   槽位: (同上)
    2.  **翻译**:
        *   (同上)
    3.  **重组**: 将翻译结果填入**不完整的模板**中，得到：
        \`{ 文本: '撤销所有 C1', 源语言: '自动', 目标语言: 'zh'\`

现在，你已完全理解这个机械化的流程。请以“Surgical Text Processor”的身份开始工作，等待我的输入。
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

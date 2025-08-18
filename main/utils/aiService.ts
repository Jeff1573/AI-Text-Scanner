import { createOpenAI, OpenAIProvider as VercelOpenAIProvider } from '@ai-sdk/openai';
import { createModuleLogger } from './logger';
import { ConfigManager } from '../managers/configManager';
import { generateText, LanguageModel } from 'ai';

const logger = createModuleLogger('AIService');

// --- 统一的接口定义 ---

/**
 * AI服务提供商类型
 * @description 支持的AI服务提供商
 */
export type AIProvider = 'openai' | 'google' | 'anthropic';

/**
 * API配置接口
 * @description 定义了连接AI服务所需的基本配置
 */
export interface APIConfig {
  /**
   * API密钥
   */
  apiKey: string;
  /**
   * API基础URL
   */
  apiUrl: string;
  /**
   * 使用的模型ID
   */
  model?: string;
  /**
   * 自定义模型ID，优先级高于model
   */
  customModel?: string;
  /**
   * AI服务提供商
   */
  provider?: AIProvider;
}

/**
 * AI服务响应接口
 * @description 标准化的AI服务响应格式
 */
export interface AIResponse {
  /**
   * AI生成的内容
   */
  content: string;
  /**
   * 错误信息，如果请求失败
   */
  error?: string;
  /**
   * token使用情况
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 图片分析请求参数
 */
export interface ImageAnalysisRequest {
  /**
   * Base64编码的图片数据
   */
  imageData: string;
  /**
   * 自定义提示词
   */
  prompt: string;
  /**
   * 最大token数
   */
  maxTokens?: number;
  /**
   * 温度参数，控制创造性
   */
  temperature?: number;
  /**
   * 目标语言
   */
  targetLang?: string;
}

/**
 * 文本翻译请求参数
 */
export interface TranslateRequest {
  /**
   * 需要翻译的文本
   */
  text: string;
  /**
   * 源语言
   */
  sourceLang: string;
  /**
   * 目标语言
   */
  targetLang: string;
}

/**
 * AI服务接口
 * @description 定义了所有AI服务必须实现的方法
 */
export interface IAiService {
  /**
   * 分析图片内容
   * @param request - 图片分析请求参数
   * @returns Promise<AIResponse>
   */
  analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse>;

  /**
   * 翻译文本
   * @param request - 翻译请求参数
   * @returns Promise<AIResponse>
   */
  translateText(request: TranslateRequest): Promise<AIResponse>;

  /**
   * 验证API配置
   * @returns Promise<boolean>
   */
  validateConfig(): Promise<boolean>;

  /**
   * 获取可用的模型列表
   * @returns Promise<string[]>
   */
  getAvailableModels(): Promise<string[]>;
}

// --- OpenAI服务实现 ---

class OpenAIService implements IAiService {
  private model: LanguageModel;
  private config: APIConfig;
  private openai: VercelOpenAIProvider;

  constructor(config: APIConfig) {
    this.config = config;
    this.openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });
    this.model = this.openai(this.getModelId());
    logger.info('OpenAI Service initialized');
  }

  /**
   * 获取当前使用的模型ID
   * @returns string
   */
  private getModelId(): string {
    return this.config.customModel || this.config.model || 'gpt-4o';
  }

  /**
   * 分析图片
   * @param request
   * @returns
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse> {
    try {
      let targetLang = request.targetLang;
      if (!targetLang) {
        const configManager = new ConfigManager();
        const globalConfig = configManager.getLatestConfigWithDefaults();
        targetLang = globalConfig.targetLang || 'zh';
      }

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
    *   根据原图背景设置样式，文本格式严格按照原图实现。
`;

      const { text, usage } = await generateText({
        model: this.model,
        system: system_prompt,
        prompt: request.prompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: request.prompt },
              {
                type: 'image',
                image: request.imageData,
              },
            ],
          },
        ],
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 10000,
      } as any);

      return {
        content: text,
        usage: {
          promptTokens: (usage as any).promptTokens,
          completionTokens: (usage as any).completionTokens,
          totalTokens: (usage as any).totalTokens,
        },
      };
    } catch (error) {
      logger.error('Image analysis failed', { error });
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 翻译文本
   * @param request
   * @returns
   */
  async translateText(request: TranslateRequest): Promise<AIResponse> {
    try {
      const system_prompt = `# 角色：你是一个高级智能翻译引擎。

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
      const { text, usage } = await generateText({
        model: this.model,
        system: system_prompt,
        prompt: `翻译成${request.targetLang}: ${request.text}`,
      });

      return {
        content: text,
        usage: {
          promptTokens: (usage as any).promptTokens,
          completionTokens: (usage as any).completionTokens,
          totalTokens: (usage as any).totalTokens,
        },
      };
    } catch (error) {
      logger.error('Text translation failed', { error });
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 验证配置
   * @returns
   */
  async validateConfig(): Promise<boolean> {
    try {
      // The Vercel AI SDK does not expose a direct way to list models.
      // We can perform a simple, low-cost text generation to validate the config.
      await generateText({
        model: this.model,
        prompt: 'Health check',
        maxTokens: 1,
      } as any);
      return true;
    } catch (error) {
      logger.error('API config validation failed', { error });
      return false;
    }
  }

  /**
   * 获取可用模型
   * @returns
   */
  async getAvailableModels(): Promise<string[]> {
    // The Vercel AI SDK abstracts model details.
    // For now, we return a predefined list of common compatible models.
    // A more robust solution might involve a provider-specific implementation
    // if the underlying provider library is exposed.
    logger.warn(
      'getAvailableModels now returns a predefined list for OpenAI.'
    );
    return [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      // Add other relevant models here
    ];
  }
}

// --- AI服务工厂 ---

/**
 * AI服务工厂
 * @description 根据提供的配置创建相应的AI服务实例
 */
export class AIServiceFactory {
  /**
   * 创建AI服务实例
   * @param config - API配置
   * @returns IAiService
   * @throws Error - 如果提供商不支持
   */
  static create(config: APIConfig): IAiService {
    const provider = config.provider || 'openai'; // 默认为openai
    logger.info(`Creating AI service for provider: ${provider}`);

    switch (provider) {
      case 'openai':
        return new OpenAIService(config);
      // case 'google':
      //   return new GoogleAIService(config); // 未来可以添加
      // case 'anthropic':
      //   return new AnthropicAIService(config); // 未来可以添加
      default:
        logger.error(`Unsupported AI provider: ${provider}`);
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

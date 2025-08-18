import { createOpenAI, OpenAIProvider as VercelOpenAIProvider } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createModuleLogger } from './logger';
import { ConfigManager } from '../managers/configManager';
import { generateText, LanguageModel } from 'ai';
import { getTranslationSystemPrompt, getTranslationUserPrompt } from './prompts';

const logger = createModuleLogger('AIService');

// --- 统一的接口定义 ---

export type AIProvider = 'openai' | 'google' | 'anthropic';

export interface APIConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  customModel?: string;
  provider?: AIProvider;
}

export interface AIResponse {
  content: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ImageAnalysisRequest {
  imageData: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  targetLang?: string;
}

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface IAiService {
  analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse>;
  translateText(request: TranslateRequest): Promise<AIResponse>;
  validateConfig(): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
}

// --- 抽象基类 ---

abstract class BaseAIService implements IAiService {
  protected model: LanguageModel;
  protected config: APIConfig;

  abstract analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse>;
  abstract validateConfig(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;

  async translateText(request: TranslateRequest): Promise<AIResponse> {
    try {
      const { text, usage } = await generateText({
        model: this.model,
        system: getTranslationSystemPrompt(),
        prompt: getTranslationUserPrompt(request.targetLang, request.text),
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
      logger.error(`${this.constructor.name} text translation failed`, { error });
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// --- 具体服务实现 ---

class OpenAIService extends BaseAIService {
  private provider: (modelId: string) => LanguageModel;

  constructor(config: APIConfig) {
    super();
    this.config = config;

    const officialBaseUrl = 'https://api.openai.com';
    const useCompatible = config.apiUrl && !config.apiUrl.startsWith(officialBaseUrl);

    if (useCompatible) {
      logger.info('Using OpenAI compatible provider');
      this.provider = createOpenAICompatible({
        name: 'openai-compatible',
        baseURL: config.apiUrl,
        apiKey: config.apiKey,
      });
    } else {
      logger.info('Using official OpenAI provider');
      this.provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
      });
    }

    this.model = this.provider(this.getModelId());
    logger.info('OpenAI Service initialized');
  }

  private getModelId(): string {
    return this.config.customModel || this.config.model || 'gpt-4o';
  }

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

  async validateConfig(): Promise<boolean> {
    try {
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

  async getAvailableModels(): Promise<string[]> {
    logger.warn('getAvailableModels now returns a predefined list for OpenAI.');
    return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
}

class GoogleAIService extends BaseAIService {
  constructor(config: APIConfig) {
    super();
    this.config = config;
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    this.model = google(config.customModel || config.model || 'gemini-pro');
    logger.info('GoogleAIService initialized');
  }

  analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse> {
    throw new Error('Method not implemented.');
  }

  async validateConfig(): Promise<boolean> {
    try {
      await generateText({
        model: this.model,
        prompt: 'Health check',
        maxTokens: 1,
      } as any);
      return true;
    } catch (error) {
      logger.error('Google API config validation failed', { error });
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    logger.warn('getAvailableModels now returns a predefined list for Google.');
    return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
  }
}

class AnthropicAIService extends BaseAIService {
  constructor(config: APIConfig) {
    super();
    this.config = config;
    const anthropic = createAnthropic({ apiKey: config.apiKey });
    this.model = anthropic(config.customModel || config.model || 'claude-3-opus-20240229');
    logger.info('AnthropicAIService initialized');
  }

  analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse> {
    throw new Error('Method not implemented.');
  }

  async validateConfig(): Promise<boolean> {
    try {
      await generateText({
        model: this.model,
        prompt: 'Health check',
        maxTokens: 1,
      } as any);
      return true;
    } catch (error) {
      logger.error('Anthropic API config validation failed', { error });
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    logger.warn('getAvailableModels now returns a predefined list for Anthropic.');
    return ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }
}

// --- AI服务工厂 ---

export class AIServiceFactory {
  static create(config: APIConfig): IAiService {
    const provider = config.provider || 'openai';
    logger.info(`Creating AI service for provider: ${provider}`);

    switch (provider) {
      case 'openai':
        return new OpenAIService(config);
      case 'google':
        return new GoogleAIService(config);
      case 'anthropic':
        return new AnthropicAIService(config);
      default:
        logger.error(`Unsupported AI provider: ${provider}`);
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

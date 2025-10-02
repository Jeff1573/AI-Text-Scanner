import { createOpenAI, openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createModuleLogger } from "./logger";
import { ConfigManager } from "../managers/configManager";
import { generateText, LanguageModel } from "ai";
import {
  buildTranslationSystemPrompt,
  buildTranslationUserPrompt,
} from "./prompts";

const logger = createModuleLogger("AIService");

// --- 统一的接口定义 ---

export type AIProvider = "openai" | "google" | "anthropic";

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

  abstract getAvailableModels(): Promise<string[]>;

  async validateConfig(): Promise<boolean> {
    try {
      // 使用与 translateText 相同的调用方式进行验证
      const { text } = await generateText({
        model: this.model,
        system: "You are a helpful assistant.",
        prompt: "Please respond with 'OK' to confirm the API is working.",
        temperature: 0,
        maxOutputTokens: 100,
      });
      
      // 验证返回内容不为空
      return text && text.trim().length > 0;
    } catch (error) {
      logger.error(`${this.constructor.name} API config validation failed`, {
        error,
      });
      return false;
    }
  }

  async analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse> {
    try {
      let targetLang = request.targetLang;
      if (!targetLang) {
        const configManager = new ConfigManager();
        const globalConfig = configManager.getLatestConfigWithDefaults();
        targetLang = globalConfig.targetLang || "zh";
      }

      // logger.info('Image analysis request', { request });
      const system_prompt = `你需要将传给你的图片中的文本内容获取下来，然后以Markdown文本的形式返回给我。请确保返回的内容是图片中的文本内容，不要有其他内容。`;

      const { text, usage } = await generateText({
        model: this.model,
        system: system_prompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: request.prompt },
              {
                type: "image",
                image: request.imageData,
              },
            ],
          },
        ],
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 10000,
      });

      return {
        content: text,
        usage: {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        },
      };
    } catch (error) {
      logger.error("Image analysis failed", { error });
      return {
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async translateText(request: TranslateRequest): Promise<AIResponse> {
    try {
      const system = buildTranslationSystemPrompt();

      const prompt = buildTranslationUserPrompt({
        targetLang: request.targetLang,
        text: request.text,
      });

      // logger.info("translateText", { model: this.model });
      const { text, usage } = await generateText({
        model: this.model,
        system,
        prompt,
        temperature: 0,
        maxOutputTokens: 10000,
      });
      return {
        content: text,
        usage: {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        },
      };
    } catch (error) {
      logger.error(`${this.constructor.name} text translation failed`, {
        error,
      });
      return {
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
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

    const officialBaseUrl = "https://api.openai.com";
    const isOfficialOpenAI =
      config.apiUrl && config.apiUrl.startsWith(officialBaseUrl);

    if (isOfficialOpenAI) {
      // 使用官方 OpenAI SDK（会自动添加 /v1）
      logger.info("Using official OpenAI provider");
      this.provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
      });
    } else {
      // 使用 OpenAI 兼容模式（不会自动添加 /v1，完全使用用户提供的 URL）
      logger.info("Using OpenAI compatible provider", { baseURL: config.apiUrl });
      this.provider = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: config.apiUrl,
        apiKey: config.apiKey,
      });
    }

    this.model = this.provider(this.getModelId());
    logger.info("OpenAI Service initialized");
  }

  private getModelId(): string {
    return this.config.customModel || this.config.model || "gpt-4o";
  }



  async getAvailableModels(): Promise<string[]> {
    logger.warn("getAvailableModels now returns a predefined list for OpenAI.");
    return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
}

class GoogleAIService extends BaseAIService {
  constructor(config: APIConfig) {
    super();
    this.config = config;
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    this.model = google(config.customModel || config.model || "gemini-pro");
    logger.info("GoogleAIService initialized");
  }

  // analyzeImage(request: ImageAnalysisRequest): Promise<AIResponse> {
  //   throw new Error('Method not implemented.');
  // }



  async getAvailableModels(): Promise<string[]> {
    logger.warn("getAvailableModels now returns a predefined list for Google.");
    return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
  }
}

class AnthropicAIService extends BaseAIService {
  constructor(config: APIConfig) {
    super();
    this.config = config;
    const anthropic = createAnthropic({ apiKey: config.apiKey });
    this.model = anthropic(
      config.customModel || config.model || "claude-3-opus-20240229"
    );
    logger.info("AnthropicAIService initialized");
  }



  async getAvailableModels(): Promise<string[]> {
    logger.warn(
      "getAvailableModels now returns a predefined list for Anthropic."
    );
    return [
      "claude-3-5-sonnet-20240620",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }
}

// --- AI服务工厂 ---

export class AIServiceFactory {
  static create(config: APIConfig): IAiService {
    const provider = config.provider || "openai";
    logger.info(`Creating AI service for provider: ${provider}`);

    switch (provider) {
      case "openai":
        return new OpenAIService(config);
      case "google":
        return new GoogleAIService(config);
      case "anthropic":
        return new AnthropicAIService(config);
      default:
        logger.error(`Unsupported AI provider: ${provider}`);
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

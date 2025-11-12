import logger from "./logger";

/**
 * Glossary mapping item used for terminology consistency.
 */
export interface GlossaryItem {
  /**
   * The source term that should be translated in a consistent way.
   */
  term: string;
  /**
   * The preferred translation for the source term.
   */
  translation: string;
}

/**
 * Options to configure the translation system prompt.
 */
export interface TranslationPromptOptions {
  /**
   * Source language code. Use "auto" to enable language detection. Default is "auto".
   */
  sourceLang?: string;
  /**
   * Target language code to translate into. Example: "zh", "en".
   */
  targetLang: string;
  /**
   * Content domain to guide tone and terminology. Example: "general", "tech", "legal".
   * For literal translation, consider setting this to "technical" or "general" and letting
   * the prompt handle specific instructions.
   */
  domain?: string;
  /**
   * Target style for the output. Example: "简洁", "正式", "友好", "学术"。
   * For literal translation, consider a more neutral or formal style.
   */
  style?: string;
  /**
   * Optional glossary to enforce consistent terminology.
   */
  glossary?: GlossaryItem[];
  /**
   * Output format for the model. Supported values: "text" | "json" | "bilingual". Default is "text".
   */
  outputFormat?: "text" | "json" | "bilingual";
  /**
   * Whether to allow identity output when source and target languages are the same. Default is true.
   */
  allowIdentity?: boolean;
  /**
   * Whether to translate code string literals and comments. Default is false.
   */
  translateCodeStrings?: boolean;
  /**
   * Whether to preserve original line breaks strictly. Default is true.
   */
  preserveLinebreaks?: boolean;
}

/**
 * Build a system prompt for translation with strict formatting and consistency rules,
 * emphasizing literal translation.
 * The prompt instructs the model to act as a Translator + Proofreader, keeping structure and semantics intact,
 * and translating all provided text literally.
 */
export const buildTranslationSystemPrompt = (): string => {
  return `# 角色：专业翻译官

你是一位经验丰富的专业翻译，精通多种语言之间的互译。你的任务是根据用户指定的目标语言，准确、流畅地翻译文本。

## 核心规则：

1. **严格遵循目标语言**：用户会明确指定目标语言，你必须将输入文本翻译为该语言，无论输入是什么语言。
2. **保持格式和结构**：保留原文的格式、换行、标点符号等结构特征。
3. **准确表达原意**：翻译应准确传达原文含义，同时符合目标语言的表达习惯。
4. **纯净输出**：只输出翻译结果，不要添加任何解释、注释或额外文字。
5. **处理特殊内容**：
   - 对于专有名词（人名、地名、品牌名等），保持原文或使用通用译名
   - 对于代码、URL等技术内容，保持不变
   - 对于数字、日期等，根据目标语言习惯调整格式

## 示例：

**示例 1：中文 → 英语**
用户输入："你好，世界！"
目标语言：英语
你的输出："Hello, World!"

**示例 2：英语 → 中文**
用户输入："Good morning!"
目标语言：简体中文
你的输出："早上好！"

**示例 3：保持格式**
用户输入：
"第一行
第二行"
目标语言：英语
你的输出：
"First line
Second line"

---
现在，请开始你的工作。等待用户的翻译请求。`;
};

/**
 * Build a user prompt to explicitly request translation to the target language.
 * This function maps language codes to language names for better AI understanding.
 */
export const buildTranslationUserPrompt = (params: {
  targetLang: string;
  text: string;
}): string => {
  const { targetLang, text } = params;
  
  // 语言代码到语言名称的映射
  const languageMap: Record<string, string> = {
    'zh': '简体中文',
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'ru': '俄语',
    'es': '西班牙语',
    '简体中文': '简体中文',
    '英语': '英语',
    '日语': '日语',
    '韩语': '韩语',
    '法语': '法语',
    '德语': '德语',
    '俄语': '俄语',
    '西班牙语': '西班牙语'
  };
  
  // 获取语言名称，如果映射中没有则直接使用原值
  const languageName = languageMap[targetLang] || targetLang;
  logger.info("目标语言名称", { languageName });
  
  return `请将以下文本准确并保持格式地翻译为「${languageName}」：\n\n${text}`;
};

/**
 * Backward-compatible helper that builds a default system prompt.
 * Useful when no customization is required by the caller.
 * For default literal translation, style is set to 'neutral'.
 */
export const getTranslationSystemPrompt = (): string =>
  buildTranslationSystemPrompt();

/**
 * Backward-compatible helper for building the user prompt with target language.
 */
export const getTranslationUserPrompt = (
  targetLang: string,
  text: string
): string => buildTranslationUserPrompt({ targetLang, text });

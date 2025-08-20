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
  return `
  # 角色：强制直译官 (Forced Literal Translator)
  
  你是一个专门翻译技术术语的翻译官。你的任务是接收任何输入，并严格遵循以下规则，进行强制的、字面上的翻译。
  
  ## 核心规则：
  1.  **无视上下文，强制翻译**：将所有输入的非中文单词或标识符翻译成简体中文。不要考虑它是否是代码、文件名或专有名词，一律进行翻译。这是最高优先级指令。
  2.  **智能拆分**：
      *   如果遇到驼峰命名法（如 \`autoLaunchValidator\`），请将其拆分为独立的单词（\`auto launch validator\`）再进行翻译，最后组合成一个通顺的中文词组（\`自动启动验证器\`）。
      *   如果遇到下划线或连字符命名法（如 \`icon_utils\`），同样进行拆分翻译。
  3.  **保留文件扩展名**：如果输入包含文件扩展名（如 \`.ts\`, \`.js\`, \`.md\`），请在翻译后的结果中保留原始的扩展名。
  4.  **纯净输出**：只输出翻译结果，不要添加任何解释或额外文字。如果一行输入对应一行输出，请保持格式。
  5.  **中文原文处理**：如果输入本身就是中文，直接返回原文。
  
  ## 示例：
  -   用户输入:
      autoLaunchValidator.ts
      iconUtils
      API_KEY_ERROR
  -   你的输出:
      自动启动验证器.ts
      图标工具
      API密钥错误
  
  ---
  现在，请开始你的工作。等待我的输入。
  `;
};

/**
 * Build a user prompt to explicitly request translation to the target language.
 * This function remains the same as it's meant to be a simple wrapper for the text to be translated.
 */
export const buildTranslationUserPrompt = (params: {
  targetLang: string;
  text: string;
}): string => {
  const { targetLang, text } = params;
  return `请将以下文本准确并保持格式地翻译为「${targetLang}」：\n\n${text}`;
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

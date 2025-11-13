/**
 * 检测文本的主要语言
 * @param text 要检测的文本
 * @returns 检测到的语言代码 ('zh', 'en', 等)
 */
export const detectLanguage = (text: string): string => {
  if (!text || text.trim().length === 0) {
    return "auto";
  }

  // 移除空白字符进行检测
  const trimmedText = text.trim();

  // 统计中文字符数量
  const chineseChars = trimmedText.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // 统计英文字符数量（包括字母和常见标点）
  const englishChars = trimmedText.match(/[a-zA-Z]/g);
  const englishCount = englishChars ? englishChars.length : 0;

  // 统计日文假名
  const japaneseChars = trimmedText.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
  const japaneseCount = japaneseChars ? japaneseChars.length : 0;

  // 统计韩文
  const koreanChars = trimmedText.match(/[\uac00-\ud7af]/g);
  const koreanCount = koreanChars ? koreanChars.length : 0;

  // 统计俄文
  const russianChars = trimmedText.match(/[\u0400-\u04ff]/g);
  const russianCount = russianChars ? russianChars.length : 0;

  // 计算总字符数（只计算有效字符）
  const totalChars = chineseCount + englishCount + japaneseCount + koreanCount + russianCount;

  // 如果没有有效字符，返回 auto
  if (totalChars === 0) {
    return "auto";
  }

  // 如果中文字符占比超过30%，判定为中文
  if (chineseCount > 0 && chineseCount / totalChars > 0.3) {
    return "zh";
  }

  // 如果日文假名占比超过20%，判定为日文
  if (japaneseCount > 0 && japaneseCount / totalChars > 0.2) {
    return "ja";
  }

  // 如果韩文字符占比超过30%，判定为韩文
  if (koreanCount > 0 && koreanCount / totalChars > 0.3) {
    return "ko";
  }

  // 如果俄文字符占比超过30%，判定为俄文
  if (russianCount > 0 && russianCount / totalChars > 0.3) {
    return "ru";
  }

  // 如果英文字符占比超过50%，判定为英文
  if (englishCount > 0 && englishCount / totalChars > 0.5) {
    return "en";
  }

  // 默认返回检测到的主要语言
  const langCounts = [
    { lang: "zh", count: chineseCount },
    { lang: "en", count: englishCount },
    { lang: "ja", count: japaneseCount },
    { lang: "ko", count: koreanCount },
    { lang: "ru", count: russianCount },
  ];

  langCounts.sort((a, b) => b.count - a.count);

  return langCounts[0].count > 0 ? langCounts[0].lang : "auto";
};

/**
 * 根据检测到的源语言智能选择目标语言
 * @param detectedLang 检测到的源语言
 * @param userPreferredTargetLang 用户在设置中配置的首选目标语言
 * @returns 智能选择的目标语言
 */
export const getSmartTargetLanguage = (
  detectedLang: string,
  userPreferredTargetLang = "zh"
): string => {
  // 如果检测到的是中文，目标语言应该是英文
  if (detectedLang === "zh") {
    return "en";
  }

  // 如果检测到的是英文，目标语言应该是中文
  if (detectedLang === "en") {
    return "zh";
  }

  // 对于其他语言，使用用户配置的目标语言
  // 但如果用户配置的目标语言和检测到的源语言相同，则改为中文
  if (userPreferredTargetLang === detectedLang) {
    return "zh";
  }

  return userPreferredTargetLang;
};

import { useCallback } from "react";
import { translate } from "../utils/translate";
import { detectLanguage, getSmartTargetLanguage } from "../utils/languageDetector";

export const useResultPageLogic = () => {
  const handleResultData = useCallback((data: string, setOriginalText: (text: string) => void, setTranslatedText: (text: string) => void) => {
    try {
      console.log("handleResultData", data);
      // 检查数据是否为JSON格式
      if (data && typeof data === 'string' && data.startsWith('{') && data.endsWith('}')) {
        try {
          const parseData = JSON.parse(data);
          setOriginalText(parseData.original || "");
        } catch (jsonError) {
          // 如果JSON解析失败，将整个数据作为原始文本
          setOriginalText(data || "");
        }
      } else if (typeof data === 'string') {
        // 非JSON格式的数据直接作为原始文本
        setOriginalText(data || "");
      } else if (typeof data === 'object' && data !== null) {
        // 如果是对象，尝试获取original字段
        setOriginalText((data as { original?: string }).original || JSON.stringify(data));
      } else {
        // 其他情况
        setOriginalText(String(data || ""));
      }
    } catch (error) {
      console.error("解析结果失败:", error);
      setOriginalText("内容解析失败");
      setTranslatedText("请检查传入的数据格式。");
    }
  }, []);

  const handleTranslate = useCallback(async (
    originalText: string,
    sourceLang: string,
    targetLang: string,
    setTranslatedText: (text: string) => void,
    setIsTranslating: (loading: boolean) => void,
    userPreferredTargetLang?: string,
    setTargetLang?: (lang: string) => void
  ) => {
    if (!originalText) return;

    setIsTranslating(true);
    try {
      // 智能语言检测和目标语言选择
      let finalTargetLang = targetLang;

      // 如果源语言是自动检测，则检测文本语言并智能选择目标语言
      if (sourceLang === "auto") {
        const detectedLang = detectLanguage(originalText);
        console.log("检测到的语言:", detectedLang);

        // 智能选择目标语言
        const smartTargetLang = getSmartTargetLanguage(
          detectedLang,
          userPreferredTargetLang || targetLang
        );
        console.log("智能选择的目标语言:", smartTargetLang);

        // 如果智能选择的目标语言与当前不同，并且提供了 setTargetLang 函数，则更新
        if (smartTargetLang !== targetLang && setTargetLang) {
          setTargetLang(smartTargetLang);
          finalTargetLang = smartTargetLang;
        } else {
          finalTargetLang = smartTargetLang;
        }
      }

      const result = await translate({
        text: originalText,
        sourceLang,
        targetLang: finalTargetLang,
      });
      setTranslatedText(result);
    } catch (error) {
      setTranslatedText("翻译失败");
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const handleSwitchLanguages = useCallback((
    sourceLang: string,
    targetLang: string,
    setSourceLang: (lang: string) => void,
    setTargetLang: (lang: string) => void,
    originalText?: string
  ) => {
    // 如果源语言是自动检测，先检测文本语言，然后进行切换
    if (sourceLang === "auto" && originalText) {
      const detectedLang = detectLanguage(originalText);
      console.log("切换语言时检测到的语言:", detectedLang);

      // 将检测到的语言设为源语言
      setSourceLang(detectedLang);
      // 将当前目标语言设为新的目标语言（实际上是原来的目标语言和检测语言互换）
      setTargetLang(targetLang);
      return;
    }

    // 如果源语言不是 auto，正常切换
    if (sourceLang !== "auto") {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
  }, []);

  const handleCopy = useCallback(async (
    translatedText: string,
    setIsCopied: (copied: boolean) => void
  ) => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("无法复制文本: ", err);
      // 显示复制失败的提示
      alert("复制失败，请手动复制文本");
    }
  }, []);

  const handleScroll = useCallback((
    source: "original" | "translated",
    originalRef: React.RefObject<HTMLTextAreaElement | null>,
    translatedRef: React.RefObject<HTMLDivElement | null>,
    isSyncing: React.MutableRefObject<boolean>
  ) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const sourceEl =
      source === "original" ? originalRef.current : translatedRef.current;
    const targetEl =
      source === "original" ? translatedRef.current : originalRef.current;

    if (sourceEl && targetEl) {
      const { scrollTop, scrollHeight, clientHeight } = sourceEl;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      targetEl.scrollTop =
        scrollRatio * (targetEl.scrollHeight - targetEl.clientHeight);
    }

    setTimeout(() => {
      isSyncing.current = false;
    }, 100); // Add a small delay to prevent jerky scrolling
  }, []);

  const loadConfig = useCallback(async (
    setSourceLang: (lang: string) => void,
    setTargetLang: (lang: string) => void
  ) => {
    const result = await window.electronAPI.loadConfig();
    if (result.success && result.config) {
      setSourceLang(result.config.sourceLang || "auto");
      setTargetLang(result.config.targetLang || "zh");
    }
  }, []);

  return {
    handleResultData,
    handleTranslate,
    handleSwitchLanguages,
    handleCopy,
    handleScroll,
    loadConfig,
  };
};

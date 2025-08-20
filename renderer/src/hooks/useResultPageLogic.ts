import { useCallback } from "react";
import { translate } from "../utils/translate";

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
    setIsTranslating: (loading: boolean) => void
  ) => {
    if (!originalText) return;

    setIsTranslating(true);
    try {
      const result = await translate({
        text: originalText,
        sourceLang,
        targetLang,
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
    setTargetLang: (lang: string) => void
  ) => {
    if (sourceLang === "auto") return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
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

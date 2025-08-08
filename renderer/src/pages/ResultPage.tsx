import { useEffect, useState, useRef, useCallback } from "react";
import { TitleBar } from "../components";
import { translate } from "../utils/translate";
import type { APIConfig } from "../types/electron";
import "../assets/styles/result-page.css";
import "../assets/styles/language-selector.css";

const languageOptions = [
  { value: "auto", label: "自动检测" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ru", label: "Русский" },
  { value: "es", label: "Español" },
];

export const ResultPage = () => {
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const originalRef = useRef<HTMLTextAreaElement>(null);
  const translatedRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const handleResultData = (data: string) => {
      try {
        console.log("handleResultData", data);
        // const parseData = JSON.parse(
        //   data
        //     .replace(/```json/g, "")
        //     .replace(/```/g, "")
        //     .trim()
        // );
        setOriginalText(data || "");
      } catch (error) {
        console.error("解析结果失败:", error);
        setOriginalText("内容解析失败");
        setTranslatedText("请检查传入的数据格式。");
      }
    };

    const loadConfig = async () => {
      const result = await window.electronAPI.loadConfig();
      if (result.success && result.config) {
        setApiConfig(result.config);
        setSourceLang(result.config.sourceLang || "auto");
        setTargetLang(result.config.targetLang || "zh");
      }
    };

    loadConfig();
    window.electronAPI.onResultData(handleResultData);

    return () => {
      window.electronAPI.removeResultDataListener();
    };
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!originalText || !apiConfig) return;

    setIsTranslating(true);
    try {
      const result = await translate(apiConfig, {
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
  }, [originalText, sourceLang, targetLang, apiConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (originalText) {
        handleTranslate();
      }
    }, 500); // Debounce translation trigger

    return () => clearTimeout(timer);
  }, [originalText, handleTranslate]);

  const handleSwitchLanguages = () => {
    if (sourceLang === "auto") return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("无法复制文本: ", err);
    }
  };

  const handleScroll = (source: "original" | "translated") => {
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
  };

  return (
    <div className="result-page">
      <TitleBar />

      <div className="translation-container">
        {/* 原文区域 */}
        <div className="text-area-container">
          <h3 className="area-title">原文</h3>
          <textarea
            ref={originalRef}
            className="text-area original-text"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            onScroll={() => handleScroll("original")}
            placeholder="请输入或粘贴待翻译的文本"
          />
        </div>

        <div className="divider"></div>
        <div className="language-selector-container">
          <select
            className="language-select"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            {languageOptions.map((lang) => (
              <option key={`source-${lang.value}`} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            className="switch-lang-button"
            onClick={handleSwitchLanguages}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </button>
          <select
            className="language-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {languageOptions
              .filter((lang) => lang.value !== "auto")
              .map((lang) => (
                <option key={`target-${lang.value}`} value={lang.value}>
                  {lang.label}
                </option>
              ))}
          </select>
        </div>

        {/* 译文区域 */}
        <div className="text-area-container">
          <h3 className="area-title">译文</h3>
          <div
            ref={translatedRef}
            className="text-area translated-text"
            onScroll={() => handleScroll("translated")}
          >
            {isTranslating ? (
              <span className="placeholder">正在翻译中...</span>
            ) : (
              translatedText || (
                <span className="placeholder">翻译结果将显示在这里</span>
              )
            )}
          </div>
          {translatedText && !isTranslating && (
            <button onClick={handleCopy} className="copy-button">
              {isCopied ? "✓ 已复制" : "复制"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

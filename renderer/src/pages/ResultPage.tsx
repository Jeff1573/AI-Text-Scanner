import { useEffect, useState, useRef } from "react";
import { TitleBar } from "../components";
import "../assets/styles/result-page.css";

export const ResultPage = () => {
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const originalRef = useRef<HTMLTextAreaElement>(null);
  const translatedRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const handleResultData = (data: string) => {
      try {
        const parseData = JSON.parse(
          data.replace(/```json/g, "").replace(/```/g, "").trim()
        );
        setOriginalText(parseData.original || "");
        setTranslatedText(parseData.translated || "");
      } catch (error) {
        console.error("解析结果失败:", error);
        setOriginalText("内容解析失败");
        setTranslatedText("请检查传入的数据格式。");
      }
    };

    window.electronAPI.onResultData(handleResultData);

    return () => {
      window.electronAPI.removeResultDataListener();
    };
  }, []);

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

    const sourceEl = source === "original" ? originalRef.current : translatedRef.current;
    const targetEl = source === "original" ? translatedRef.current : originalRef.current;

    if (sourceEl && targetEl) {
      const { scrollTop, scrollHeight, clientHeight } = sourceEl;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      targetEl.scrollTop = scrollRatio * (targetEl.scrollHeight - targetEl.clientHeight);
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

        {/* 译文区域 */}
        <div className="text-area-container">
          <h3 className="area-title">译文</h3>
          <div
            ref={translatedRef}
            className="text-area translated-text"
            onScroll={() => handleScroll("translated")}
          >
            {translatedText || <span className="placeholder">翻译结果将显示在这里</span>}
          </div>
          {translatedText && (
            <button onClick={handleCopy} className="copy-button">
              {isCopied ? "✓ 已复制" : "复制"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

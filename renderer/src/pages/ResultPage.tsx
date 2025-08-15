import { useEffect } from "react";
import { TitleBar, LanguageSelector, TextArea } from "../components";
import { useResultPageState } from "../hooks/useResultPageState";
import { useResultPageLogic } from "../hooks/useResultPageLogic";
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
  const {
    originalText,
    setOriginalText,
    translatedText,
    setTranslatedText,
    isCopied,
    setIsCopied,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    isTranslating,
    setIsTranslating,
    originalRef,
    translatedRef,
    isSyncing,
  } = useResultPageState();

  const {
    handleResultData,
    handleTranslate,
    handleSwitchLanguages,
    handleCopy,
    handleScroll,
    loadConfig,
  } = useResultPageLogic();

  useEffect(() => {
    originalRef.current?.focus();
  }, [originalRef]);

  useEffect(() => {
    const loadConfigAndSetup = async () => {
      await loadConfig(setSourceLang, setTargetLang);
    };

    const handleResultDataWrapper = (data: string) => {
      handleResultData(data, setOriginalText, setTranslatedText);
    };

    loadConfigAndSetup();
    window.electronAPI.onResultData(handleResultDataWrapper);

    return () => {
      window.electronAPI.removeResultDataListener();
    };
  }, [loadConfig, setSourceLang, setTargetLang, handleResultData, setOriginalText, setTranslatedText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (originalText) {
        handleTranslate(originalText, sourceLang, targetLang, setTranslatedText, setIsTranslating);
      }
    }, 500); // Debounce translation trigger

    return () => clearTimeout(timer);
  }, [originalText, sourceLang, targetLang, handleTranslate, setTranslatedText, setIsTranslating]);

  const handleSwitchLanguagesWrapper = () => {
    handleSwitchLanguages(sourceLang, targetLang, setSourceLang, setTargetLang);
  };

  const handleCopyWrapper = () => {
    handleCopy(translatedText, setIsCopied);
  };

  const handleScrollWrapper = (source: "original" | "translated") => {
    handleScroll(source, originalRef, translatedRef, isSyncing);
  };

  return (
    <div className="result-page">
      <TitleBar />

      <div className="translation-container">
        <TextArea
          type="original"
          title="原文"
          value={originalText}
          onChange={setOriginalText}
          onScroll={() => handleScrollWrapper("original")}
          ref={originalRef}
          placeholder="请输入或粘贴待翻译的文本"
        />

        <div className="divider"></div>
        
        <LanguageSelector
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
          onSwitchLanguages={handleSwitchLanguagesWrapper}
          languageOptions={languageOptions}
        />

        <TextArea
          type="translated"
          title="译文"
          value={translatedText}
          onScroll={() => handleScrollWrapper("translated")}
          ref={translatedRef}
          isTranslating={isTranslating}
          onCopy={handleCopyWrapper}
          isCopied={isCopied}
        />
      </div>
    </div>
  );
};

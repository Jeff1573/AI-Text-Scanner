import { useState, useRef } from "react";

export const useResultPageState = () => {
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [isTranslating, setIsTranslating] = useState(false);

  const originalRef = useRef<HTMLTextAreaElement>(null);
  const translatedRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  return {
    // 状态
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
    // 引用
    originalRef,
    translatedRef,
    isSyncing,
  };
};

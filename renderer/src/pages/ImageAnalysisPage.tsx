import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Row, Col, Typography, Card, Image, Flex, Tabs, TabsProps, Button, message } from "antd";
import { CopyOutlined, PictureOutlined } from "@ant-design/icons";
import { TitleBar, LanguageSelector } from "../components";
import { translate } from "../utils/translate";
import "../assets/styles/language-selector.css";

const { Paragraph } = Typography;

// 语言选项配置
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

/**
 * 去除markdown格式，只保留纯文本内容
 * @param markdownText markdown格式的文本
 * @returns 纯文本内容
 */
const removeMarkdownFormat = (markdownText: string): string => {
  if (!markdownText) return "";

  return (
    markdownText
      // 去除代码块标记（保留内容）
      .replace(/```[\w]*\n?/g, "")
      .replace(/```$/g, "")
      // 去除行内代码标记
      .replace(/`([^`]+)`/g, "$1")
      // 去除标题标记
      .replace(/^#{1,6}\s+/gm, "")
      // 去除粗体和斜体标记
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // 去除删除线
      .replace(/~~([^~]+)~~/g, "$1")
      // 去除链接，只保留文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 去除图片标记
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // 去除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // 去除引用标记
      .replace(/^>\s+/gm, "")
      // 去除水平分割线
      .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, "")
      // 去除表格标记
      .replace(/\|/g, " ")
      .replace(/^[\s]*[-|]+\s*$/gm, "")
      // 去除HTML标签
      .replace(/<[^>]+>/g, "")
      // 清理多余的空行
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      // 去除首尾空白
      .trim()
  );
};

interface ImageAnalysisPageProps {
  imageUrl?: string;
  analysisText?: string;
}

type TabKeyType = "text" | "translate";

export const ImageAnalysisPage: React.FC<ImageAnalysisPageProps> = () => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [analysisText, setAnalysisText] = useState<string>("");
  const [translateText, setTranslateText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [tabActive, setTabActive] = useState<TabKeyType>("text");
  const [sourceLang, setSourceLang] = useState<string>("auto");
  const [targetLang, setTargetLang] = useState<string>("zh");

  // 复制文本到剪切板
  const handleCopyText = useCallback(async () => {
    if (!analysisText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(analysisText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = analysisText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("已复制到剪切板");
    } catch (err) {
      console.error("复制失败:", err);
      message.error("复制失败，请手动复制");
    }
  }, [analysisText]);

  // 复制图片到剪切板
  const handleCopyImage = useCallback(async () => {
    if (!imageUrl) return;
    
    try {
      // 检查浏览器是否支持剪切板API
      if (!navigator.clipboard || !navigator.clipboard.write) {
        message.error("您的浏览器不支持复制图片到剪切板");
        return;
      }

      // 将base64图片转换为Blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // 创建ClipboardItem
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });
      
      // 写入剪切板
      await navigator.clipboard.write([clipboardItem]);
      message.success("图片已复制到剪切板");
    } catch (err) {
      console.error("复制图片失败:", err);
      // 提供备用方案的提示
      message.error("复制图片失败，请右键图片手动复制");
    }
  }, [imageUrl]);

  // 翻译处理函数
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

  // 切换语言函数
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

  // 加载配置
  const loadConfig = useCallback(async (
    setSourceLang: (lang: string) => void,
    setTargetLang: (lang: string) => void
  ) => {
    try {
      const result = await window.electronAPI.loadConfig();
      if (result.success && result.config) {
        setSourceLang(result.config.sourceLang || "auto");
        setTargetLang(result.config.targetLang || "zh");
      }
    } catch (error) {
      console.error("加载配置失败:", error);
    }
  }, []);

  const tabShowContent = useMemo(() => {
    switch (tabActive) {
      case "text":
        return analysisText;
      case "translate":
        return translateText;
      default:
        return;
    }
  }, [tabActive, analysisText, translateText]);

  const items: TabsProps["items"] = [
    {
      key: "text",
      label: "文本",
    },
    {
      key: "translate",
      label: "翻译",
    },
  ];

  const onChange = (key: any) => {
    console.log(key);
    setTabActive(key);
  };

  // 当切换到翻译tab时，自动翻译文本
  useEffect(() => {
    if (tabActive === "translate" && analysisText && !translateText) {
      handleTranslate(analysisText, sourceLang, targetLang, setTranslateText, setIsTranslating);
    }
  }, [tabActive, analysisText, translateText, sourceLang, targetLang, handleTranslate]);

  // 当语言设置改变时，重新翻译
  useEffect(() => {
    if (tabActive === "translate" && analysisText) {
      const timer = setTimeout(() => {
        handleTranslate(analysisText, sourceLang, targetLang, setTranslateText, setIsTranslating);
      }, 500); // Debounce translation trigger

      return () => clearTimeout(timer);
    }
  }, [analysisText, sourceLang, targetLang, tabActive, handleTranslate]);

  useEffect(() => {
    // 从 LocalStorage 获取选中的图片数据
    const selectedImageData = localStorage.getItem("selectedImageData");
    if (selectedImageData) {
      try {
        setImageUrl(selectedImageData);
      } catch (error) {
        console.error("解析图片数据失败:", error);
      }
    }

    // 从主进程获取图片分析数据
    const fetchAnalysisData = async () => {
      try {
        setLoading(true);
        window.electronAPI.onImageAnalysisResult((data) => {
          if (data) {
            const cleanText = removeMarkdownFormat(data) || "";
            setAnalysisText(cleanText);
            // 如果当前在翻译tab，清空翻译文本，触发重新翻译
            if (tabActive === "translate") {
              setTranslateText("");
            }
          }
        });
      } catch (error) {
        console.error("获取图片分析数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    // 加载配置
    loadConfig(setSourceLang, setTargetLang);
    fetchAnalysisData();
  }, [loadConfig, tabActive]);

  const handleSwitchLanguagesWrapper = () => {
    handleSwitchLanguages(sourceLang, targetLang, setSourceLang, setTargetLang);
  };

  return (
    <Flex
      gap={10}
      vertical
      style={{ height: "100vh", padding: 10, paddingTop: 50, overflow: "hidden" }}
    >
      <TitleBar />
      <Row gutter={16} style={{ flex: 1, minHeight: 0, maxHeight: "calc(100vh - 50px)" }}>
        <Col span={12} style={{ display: "flex", flexDirection: "column", minHeight: 0, maxHeight: "100%" }}>
          <Card
            title="选中区域图片"
            extra={
              imageUrl ? (
                <Button size="small" icon={<PictureOutlined />} onClick={handleCopyImage}>
                  复制图片
                </Button>
              ) : null
            }
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              maxHeight: "100%",
              height: "100%",
            }}
            styles={{
              body: {
                flex: 1,
                minHeight: 0,
                maxHeight: "calc(100% - 57px)", // 减去Card标题高度
                padding: 0,
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              },
            }}
          >
            {loading ? (
              <div>加载中...</div>
            ) : imageUrl ? (
              <div style={{ 
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center",
                overflow: "hidden"
              }}>
                <Image
                  style={{ 
                    maxWidth: "100%", 
                    maxHeight: "100%", 
                    objectFit: "contain",
                    width: "auto",
                    height: "auto"
                  }}
                  src={imageUrl}
                  alt="选中区域图片"
                />
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🖼️</div>
                <div>暂无图片</div>
              </div>
            )}
          </Card>
        </Col>
        <Col span={12} style={{ display: "flex", flexDirection: "column", minHeight: 0, maxHeight: "100%" }}>
          <Card
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, maxHeight: "100%", height: "100%" }}
            title={
              <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
            }
            extra={
              tabActive === "text" && analysisText ? (
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopyText}>
                  复制文本
                </Button>
              ) : null
            }
            styles={{
              body: {
                paddingTop: 0,
                flex: 1,
                minHeight: 0,
                maxHeight: "calc(100% - 57px)", // 减去Card标题高度
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflow: "auto",
                padding: "16px",
              },
            }}
          >
            {tabActive === "translate" && (
              <div style={{ marginBottom: "16px" }}>
                <LanguageSelector
                  sourceLang={sourceLang}
                  targetLang={targetLang}
                  onSourceLangChange={setSourceLang}
                  onTargetLangChange={setTargetLang}
                  onSwitchLanguages={handleSwitchLanguagesWrapper}
                  languageOptions={languageOptions}
                />
              </div>
            )}
            {tabActive === "translate" && isTranslating ? (
              <div style={{ textAlign: "center", color: "#999" }}>
                <div>翻译中...</div>
              </div>
            ) : (
              tabShowContent
            )}
          </Card>
        </Col>
      </Row>
    </Flex>
  );
};

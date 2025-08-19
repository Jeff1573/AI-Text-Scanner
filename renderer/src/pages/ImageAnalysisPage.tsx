import React, { useState, useEffect, useMemo } from "react";
import { Row, Col, Typography, Card, Image, Flex, Tabs, TabsProps } from "antd";
import { TitleBar } from "../components";

const { Paragraph } = Typography;

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
  const [translateText, setTranslateText] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [tabActive, setTabActive] = useState<TabKeyType>("text");

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
            setAnalysisText(removeMarkdownFormat(data) || "");
          }
        });
      } catch (error) {
        console.error("获取图片分析数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, []);

  return (
    <Flex
      gap={10}
      vertical
      style={{ height: "100vh", padding: 10, paddingTop: 60 }}
    >
      <TitleBar />
      <Row gutter={16} style={{ flex: 1 }}>
        <Col span={12} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            title="选中区域图片"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
            styles={{
              body: {
                flex: 1,
                padding: 0,
                display: "flex", // 保持flex布局，但允许内容自然撑开
                justifyContent: "center", // 居中图片
                alignItems: "center", // 垂直居中图片
              },
            }}
          >
            {loading ? (
              <div>加载中...</div>
            ) : imageUrl ? (
              <Image
                height={"100%"}
                style={{ objectFit: "contain" }} // 添加此行
                src={imageUrl}
                alt="选中区域图片"
              />
            ) : (
              <div style={{ textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🖼️</div>
                <div>暂无图片</div>
              </div>
            )}
          </Card>
        </Col>
        <Col span={12} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            title={
              <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
            }
            styles={{
              body: {
                paddingTop: 0,
                flex: 1,
              },
            }}
          >
            <div
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                height: "100%",
                overflow: "auto",
                padding: "16px",
              }}
            >
              {tabShowContent}
            </div>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
};

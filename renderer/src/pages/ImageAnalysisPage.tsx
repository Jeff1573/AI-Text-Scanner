import React, { useState, useEffect } from "react";
import { Row, Col, Typography, Card, Image, Flex } from "antd";
import { TitleBar } from "../components";

const { Paragraph } = Typography;

interface ImageAnalysisPageProps {
  imageUrl?: string;
  analysisText?: string;
}

export const ImageAnalysisPage: React.FC<ImageAnalysisPageProps> = () => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [analysisText, setAnalysisText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // 从 LocalStorage 获取选中的图片数据
    const selectedImageData = localStorage.getItem("selectedImageData");
    console.log("selectedImageData", selectedImageData);
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
            setAnalysisText(data.replace(/```|`/g, "") || "");
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
                height={"calc(100% - 100px)"}
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
            title="解析结果"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            bodyStyle={{ flex: 1, overflowY: "auto" }}
          >
            {loading ? (
              <div>加载中...</div>
            ) : analysisText ? (
              <Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {analysisText}
              </Paragraph>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#999",
                  paddingTop: "50px",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <div>暂无解析结果</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Flex>
  );
};

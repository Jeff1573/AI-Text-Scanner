import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/image-display.css";
import "../assets/styles/SelectedImageToolbar.css";

interface SelectedImageInfo {
  width: number;
  height: number;
}

interface SelectedImageDisplayProps {
  selectedImage: string | null;
  selectedImageInfo: SelectedImageInfo | null;
  onClear: () => void;
}

/**
 * 选中图片显示组件
 * 
 * 显示原生截图后的图片预览，并提供操作工具栏（复制、分析、清除）
 */
export const SelectedImageDisplay = ({
  selectedImage,
  selectedImageInfo,
  onClear,
}: SelectedImageDisplayProps) => {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * 复制图片到剪切板
   */
  const handleCopyImage = useCallback(async () => {
    if (!selectedImage || isCopying) return;

    setIsCopying(true);
    try {
      // 检查浏览器是否支持剪切板 API
      if (!navigator.clipboard || !navigator.clipboard.write) {
        alert("您的浏览器不支持复制图片到剪切板");
        return;
      }

      // 将 base64 图片转换为 Blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      // 创建 ClipboardItem
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob,
      });

      // 写入剪切板
      await navigator.clipboard.write([clipboardItem]);
      
      // 显示成功提示
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error("复制图片失败:", error);
      alert("复制图片失败，请重试");
    } finally {
      setIsCopying(false);
    }
  }, [selectedImage, isCopying]);

  /**
   * 分析图片内容
   */
  const handleAnalyzeImage = useCallback(async () => {
    if (!selectedImage || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      console.log("开始分析图片...");
      
      // 调用 AI 分析接口
      const result = await window.electronAPI.analyzeImage({
        imageData: selectedImage,
        prompt: "请识别并提取图片中的所有文字内容，保持原有的格式和排版。",
      });

      if (result.content) {
        console.log("图片分析成功，导航到分析页面");
        
        // 将分析结果存储到 localStorage
        localStorage.setItem("latestAnalysisResult", result.content);
        localStorage.setItem("latestAnalysisTimestamp", Date.now().toString());
        
        // 导航到图片分析页面
        navigate("/image-analysis");
      } else {
        console.error("图片分析失败:", result.error);
        alert(`分析失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("分析图片失败:", error);
      alert(`分析失败: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, isAnalyzing, navigate]);

  if (!selectedImage) return null;

  return (
    <div className="selected-image-content">
      <div className="selected-image-wrapper">
        <img
          src={selectedImage}
          alt="选中的图片"
          className="selected-image"
        />
        {selectedImageInfo && selectedImageInfo.width > 0 && selectedImageInfo.height > 0 && (
          <div className="selected-image-info">
            <p>
              尺寸: {selectedImageInfo.width} x {selectedImageInfo.height} 像素
            </p>
          </div>
        )}
      </div>

      {/* 操作工具栏 */}
      <div className="selected-image-toolbar-container">
        {copySuccess && (
          <div className="selected-image-toolbar-tooltip">
            图片已复制到剪切板
          </div>
        )}
        <div className="selected-image-toolbar">
          <button
            onClick={handleCopyImage}
            className={`selected-image-toolbar-button copy ${copySuccess ? "success" : ""}`}
            disabled={isCopying}
            title="复制图片到剪切板"
          >
            <span className="selected-image-toolbar-icon">
              {isCopying ? "⏳" : copySuccess ? "✅" : "📋"}
            </span>
            <span className="selected-image-toolbar-text">
              {isCopying ? "复制中..." : copySuccess ? "已复制" : "复制图片"}
            </span>
          </button>

          <button
            onClick={handleAnalyzeImage}
            className="selected-image-toolbar-button analyze"
            disabled={isAnalyzing}
            title="分析图片内容"
          >
            <span className="selected-image-toolbar-icon">
              {isAnalyzing ? "⏳" : "🔍"}
            </span>
            <span className="selected-image-toolbar-text">
              {isAnalyzing ? "分析中..." : "分析图片"}
            </span>
          </button>

          <button
            onClick={onClear}
            className="selected-image-toolbar-button clear"
            disabled={isAnalyzing}
            title="清除图片"
          >
            <span className="selected-image-toolbar-icon">🗑️</span>
            <span className="selected-image-toolbar-text">清除</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 
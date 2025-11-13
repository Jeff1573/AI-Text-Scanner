import { useState, useEffect, useCallback } from "react";
import "../assets/styles/screenshot-preview.css";

/**
 * 截图预览弹窗页面
 * 
 * 在独立窗口中显示原生截图结果，并提供操作工具栏
 */
export const ScreenshotPreviewPage = () => {
  const [imageData, setImageData] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 监听截图数据
  useEffect(() => {
    const handleScreenshotData = (data: string) => {
      console.log("收到截图数据");
      setImageData(data);
    };

    window.electronAPI.onScreenshotPreviewData(handleScreenshotData);

    return () => {
      window.electronAPI.removeScreenshotPreviewDataListener();
    };
  }, []);

  /**
   * 复制图片到剪切板
   */
  const handleCopyImage = useCallback(async () => {
    if (!imageData || isCopying) return;

    setIsCopying(true);
    try {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        alert("您的浏览器不支持复制图片到剪切板");
        return;
      }

      const response = await fetch(imageData);
      const blob = await response.blob();
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob,
      });

      await navigator.clipboard.write([clipboardItem]);
      
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        // 复制成功后关闭窗口
        window.close();
      }, 1000);
    } catch (error) {
      console.error("复制图片失败:", error);
      alert("复制图片失败，请重试");
    } finally {
      setIsCopying(false);
    }
  }, [imageData, isCopying]);

  /**
   * 分析图片内容
   */
  const handleAnalyzeImage = useCallback(async () => {
    if (!imageData || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      console.log("开始分析图片...");
      // 清理上一次识别结果，避免误读旧内容
      try {
        localStorage.removeItem("latestAnalysisResult");
        localStorage.removeItem("latestAnalysisTimestamp");
      } catch (storageError) {
        console.warn("清理localStorage失败", storageError);
      }
      
      // 保存图片到 localStorage 供分析页面使用
      localStorage.setItem("selectedImageData", imageData);
      localStorage.setItem("selectedImageInfo", JSON.stringify({
        width: 0,
        height: 0,
        size: imageData.length,
        format: 'png',
      }));

      // 调用 AI 分析接口
      const result = await window.electronAPI.analyzeImage({
        imageData: imageData,
        prompt: "请识别并提取图片中的所有文字内容，保持原有的格式和排版。",
      });

      if (result.content) {
        console.log("图片分析成功，内容长度:", result.content.length);
        
        // 将分析结果存储到 localStorage
        localStorage.setItem("latestAnalysisResult", result.content);
        localStorage.setItem("latestAnalysisTimestamp", Date.now().toString());
        
        console.log("已保存到 localStorage:", {
          contentLength: result.content.length,
          timestamp: Date.now()
        });
        
        // 先打开主窗口并导航到分析页面
        await window.electronAPI.openMainWindowWithRoute("/image-analysis");
        
        // 稍作延迟后关闭预览窗口，确保主窗口已经打开并读取了数据
        setTimeout(() => {
          window.close();
        }, 500);
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
  }, [imageData, isAnalyzing]);

  /**
   * 关闭窗口
   */
  const handleClose = useCallback(() => {
    window.close();
  }, []);

  if (!imageData) {
    return (
      <div className="screenshot-preview-page loading">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  return (
    <div className="screenshot-preview-page">
      {/* 图片预览区域 */}
      <div className="screenshot-preview-content">
        <img
          src={imageData}
          alt="截图预览"
          className="screenshot-preview-image"
        />
      </div>

      {/* 底部工具栏 */}
      <div className="screenshot-preview-toolbar-container">
        {copySuccess && (
          <div className="screenshot-preview-tooltip">
            图片已复制到剪切板
          </div>
        )}
        <div className="screenshot-preview-toolbar">
          <button
            onClick={handleCopyImage}
            className={`screenshot-preview-button copy ${copySuccess ? "success" : ""}`}
            disabled={isCopying}
            title="复制图片到剪切板"
          >
            <span className="button-icon">
              {isCopying ? "⏳" : copySuccess ? "✅" : "📋"}
            </span>
            <span className="button-text">
              {isCopying ? "复制中..." : copySuccess ? "已复制" : "复制图片"}
            </span>
          </button>

          <button
            onClick={handleAnalyzeImage}
            className="screenshot-preview-button analyze"
            disabled={isAnalyzing}
            title="分析图片内容"
          >
            <span className="button-icon">
              {isAnalyzing ? "⏳" : "🔍"}
            </span>
            <span className="button-text">
              {isAnalyzing ? "分析中..." : "分析图片"}
            </span>
          </button>

          <button
            onClick={handleClose}
            className="screenshot-preview-button close"
            disabled={isAnalyzing}
            title="关闭"
          >
            <span className="button-icon">❌</span>
            <span className="button-text">关闭</span>
          </button>
        </div>
      </div>
    </div>
  );
};


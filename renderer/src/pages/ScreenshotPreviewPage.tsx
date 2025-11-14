import { useState, useEffect, useCallback, useRef } from "react";
import { FloatingToolbar } from "../components/FloatingToolbar";
import { copyImageToClipboard } from "../utils/clipboardUtils";
import "../assets/styles/screenshot-preview.css";

/**
 * 截图预览弹窗页面
 * 
 * 在独立窗口中显示原生截图结果，并提供操作工具栏
 */
export const ScreenshotPreviewPage = () => {
  const [imageData, setImageData] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 为截图预览页调整 body/html 布局，避免窗口缩小时出现滚动条
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      minWidth: body.style.minWidth,
      minHeight: body.style.minHeight,
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.minWidth = "0";
    body.style.minHeight = "0";

    return () => {
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;
      body.style.minWidth = prev.minWidth;
      body.style.minHeight = prev.minHeight;
    };
  }, []);

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
   * 根据图片在舞台中的位置更新工具栏锚点位置
   *
   * 工具栏会跟随图片底部居中显示，当窗口大小变化或图片加载完成后重新计算位置。
   */
  const updateSelectionFromImage = useCallback(() => {
    const stageElement = stageRef.current;
    const imageElement = imageRef.current;

    if (!stageElement || !imageElement) {
      return;
    }

    const stageRect = stageElement.getBoundingClientRect();
    const imageRect = imageElement.getBoundingClientRect();

    const offsetX = imageRect.left - stageRect.left;
    const offsetY = imageRect.top - stageRect.top;
    const centerX = offsetX + imageRect.width / 2;
    // 让工具栏稍微覆盖在图片底部内部，而不是完全位于图片下方，避免被容器裁剪
    const desiredY = offsetY + imageRect.height - 40;
    const clampedY = Math.max(0, desiredY);

    setSelection({
      // +10 与 FloatingToolbar 内部 -10 偏移相抵，用于让工具栏水平居中于图片
      x: centerX + 10,
      // 使用图片底部附近作为工具栏锚点，保证始终位于容器可见区域内
      y: clampedY,
      width: 0,
      height: 0,
    });
  }, []);

  // 图片数据变化时（例如接收到新的截图）重新计算工具栏位置
  useEffect(() => {
    if (!imageData) {
      return;
    }

    const timerId = window.setTimeout(() => {
      updateSelectionFromImage();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [imageData, updateSelectionFromImage]);

  // 窗口大小变化时，重新计算工具栏位置
  useEffect(() => {
    const handleResize = () => {
      updateSelectionFromImage();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateSelectionFromImage]);

  /**
   * 复制当前截图到剪切板
   */
  const handleCopyImage = useCallback(async () => {
    if (!imageData) return;

    try {
      await copyImageToClipboard(imageData);
    } catch (error) {
      console.error("复制图片失败:", error);
      alert("复制图片失败，请重试");
    }
  }, [imageData]);

  /**
   * 分析图片内容
   */
  const handleAnalyzeImage = useCallback(async () => {
    if (!imageData || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      console.log("开始分析图片，准备跳转到结果页面...");
      // 清理上一次识别结果，避免误读旧内容
      try {
        localStorage.removeItem("latestAnalysisResult");
        localStorage.removeItem("latestAnalysisTimestamp");
      } catch (storageError) {
        console.warn("清理localStorage失败", storageError);
      }

      // 保存图片到 localStorage，交给 ImageAnalysisPage 统一触发 AI 分析
      localStorage.setItem("selectedImageData", imageData);
      localStorage.setItem(
        "selectedImageInfo",
        JSON.stringify({
          width: 0,
          height: 0,
          size: imageData.length,
          format: "png",
        })
      );

      // 打开主窗口并导航到图片分析页面
      await window.electronAPI.openMainWindowWithRoute("/image-analysis");

      // 稍作延迟后关闭预览窗口，确保主窗口已经打开并读取了数据
      setTimeout(() => {
        window.close();
      }, 300);
    } catch (error) {
      console.error("跳转到分析页面失败:", error);
      alert(`打开分析页面失败: ${error}`);
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

  /**
   * 贴图：将当前整张截图作为贴图窗口展示
   */
  const handleSticker = useCallback(async () => {
    if (!imageData) return;

    try {
      const img = new Image();

      img.onload = async () => {
        try {
          const originalWidth = img.naturalWidth;
          const originalHeight = img.naturalHeight;

          if (!originalWidth || !originalHeight) {
            alert("无法获取图片尺寸，贴图失败");
            return;
          }

          await window.electronAPI.createStickerWindow(
            imageData,
            originalWidth,
            originalHeight
          );

          try {
            await window.electronAPI.windowHide();
          } catch (hideError) {
            console.error("隐藏截图预览窗口失败:", hideError);
            window.close();
          }
        } catch (error) {
          console.error("创建贴图失败:", error);
          alert("创建贴图失败，请重试");
        }
      };

      img.onerror = () => {
        alert("图片加载失败，无法贴图");
      };

      img.src = imageData;
    } catch (error) {
      console.error("贴图功能失败:", error);
      alert("贴图功能失败，请重试");
    }
  }, [imageData]);

  /**
   * 处理键盘事件：按下 ESC 时关闭截图预览窗口
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  /**
   * 复制成功后的回调：在工具栏内部短暂展示提示后关闭窗口
   */
  const handleCopySuccess = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!imageData) {
    return (
      <div className="screenshot-preview-page loading">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  return (
    <div className="screenshot-preview-page">
      {/* 图片预览区域，承载图片与浮动工具栏 */}
      <div className="screenshot-preview-content" ref={stageRef}>
        <img
          ref={imageRef}
          src={imageData}
          alt="截图预览"
          className="screenshot-preview-image"
          onLoad={updateSelectionFromImage}
        />

        <FloatingToolbar
          onConfirm={handleAnalyzeImage}
          onCancel={handleClose}
          onCopy={handleCopyImage}
          onCopySuccess={handleCopySuccess}
          onSticker={handleSticker}
          selection={selection}
          positionMode="imageBottom"
        />
      </div>
    </div>
  );
};

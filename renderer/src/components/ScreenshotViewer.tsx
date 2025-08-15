import { useCallback, useEffect } from "react";
import { useScreenshotViewerState } from "../hooks/useScreenshotViewerState";
import { useScreenshotViewerEffects } from "../hooks/useScreenshotViewerEffects";
import { useImageAnalysis } from "../hooks/useImageAnalysis";
import {
  calculateCropCoordinates,
  cropImage,
  saveSelectedImage,
} from "../utils/imageUtils";
import {
  getImageElement,
  getClampedPosition,
  calculateSelection,
  isValidSelection,
} from "../utils/mouseUtils";
import { ScreenshotContent } from "./ScreenshotContent";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { NoDataState } from "./NoDataState";
import "../assets/styles/screenshot-viewer.css";

export const ScreenshotViewer = () => {
  const {
    screenshotData,
    setScreenshotData,
    loading,
    setLoading,
    error,
    setError,
    showSelector,
    setShowSelector,
    selection,
    setSelection,
    isSelecting,
    setIsSelecting,
    startPos,
    setStartPos,
    resetSelection,
  } = useScreenshotViewerState();

  // 图片分析状态
  const {
    analysisResult,
    analysisError,
    isAnalyzing,
    analyzeImage,
    clearAnalysis,
  } = useImageAnalysis();

  useScreenshotViewerEffects(
    setScreenshotData,
    setLoading,
    setError,
    setShowSelector,
    loading
  );

  // 监听识别结果，成功则打开新的HTML查看器窗口，失败则提示
  useEffect(() => {
    if (analysisResult && !analysisError) {
      console.log("analysisResult", analysisResult);
      // 调用主进程创建HTML查看器窗口
      window.electronAPI.openHtmlViewer(analysisResult, "AI 分析结果")
        .then((result: { success: boolean; error?: string }) => {
          if (result.success) {
            console.log("HTML查看器窗口创建成功");
            // 关闭当前截图窗口
            window.close();
          } else {
            console.error("HTML查看器窗口创建失败:", result.error);
            alert("打开结果窗口失败: " + result.error);
          }
        })
        .catch((error: unknown) => {
          console.error("调用HTML查看器失败:", error);
          alert("打开结果窗口失败");
        });
    } else if (analysisError) {
      alert(analysisError);
      clearAnalysis();
      resetSelection();
    }
  }, [analysisResult, analysisError, clearAnalysis, resetSelection]);

  // 支持按 ESC 关闭窗口
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!showSelector) return;
      const imgElement = getImageElement();
      if (!imgElement) return;
      const position = getClampedPosition(e.clientX, e.clientY, imgElement);
      setStartPos(position);
      setSelection({ ...position, width: 0, height: 0 });
      setIsSelecting(true);
    },
    [showSelector, setStartPos, setSelection, setIsSelecting]
  );

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !showSelector) return;
      const imgElement = getImageElement();
      if (!imgElement) return;
      const currentPos = getClampedPosition(e.clientX, e.clientY, imgElement);
      const newSelection = calculateSelection(currentPos, startPos);
      setSelection(newSelection);
    },
    [isSelecting, showSelector, startPos, setSelection]
  );

  // 处理鼠标松开事件
  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !showSelector) return;
    setIsSelecting(false);
    // 如果选择区域太小，忽略
    if (!isValidSelection(selection)) {
      resetSelection();
      return;
    }
    handleGetSelectedContent();
  }, [isSelecting, showSelector, selection, setIsSelecting, resetSelection]);

  // 获取选中内容
  const handleGetSelectedContent = useCallback(async () => {
    if (!screenshotData) return;
    const imgElement = getImageElement();
    if (!imgElement) return;
    const displayRect = imgElement.getBoundingClientRect();
    const img = new Image();
    img.onload = async () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const displayWidth = displayRect.width;
      const displayHeight = displayRect.height;
      const cropCoords = calculateCropCoordinates(
        selection,
        originalWidth,
        originalHeight,
        displayWidth,
        displayHeight
      );
      try {
        const selectedImageData = await cropImage(
          screenshotData.thumbnail,
          cropCoords
        );
        saveSelectedImage(
          selectedImageData,
          cropCoords.width,
          cropCoords.height
        );
        // 进行图片分析
        await analyzeImage(selectedImageData);
      } catch (error) {
        alert("裁剪图片失败，请重试");
        resetSelection();
      }
    };
    img.src = screenshotData.thumbnail;
  }, [screenshotData, selection, analyzeImage, resetSelection]);

  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorState error={error} />;
  }
  if (!screenshotData) {
    return <NoDataState />;
  }
  return (
    <div className="screenshot-viewer">
      <div className="screenshot-stage">
        <ScreenshotContent
          screenshotData={screenshotData}
          showSelector={showSelector}
          selection={selection}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {isAnalyzing && (
          <>
            <div className="stage-dim"></div>
            <div className="analysis-inline-overlay">
              <div className="loading-spinner"></div>
              <h3>正在识别中...</h3>
              <p>请稍候，AI正在分析您选择的区域</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

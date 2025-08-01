import { useCallback } from "react";
import { useScreenshotViewerState } from "../hooks/useScreenshotViewerState";
import { useScreenshotViewerEffects } from "../hooks/useScreenshotViewerEffects";
import { calculateCropCoordinates, cropImage, saveSelectedImage } from "../utils/imageUtils";
import { getImageElement, getClampedPosition, calculateSelection, isValidSelection } from "../utils/mouseUtils";
import { ScreenshotHeader } from "./ScreenshotHeader";
import { ScreenshotContent } from "./ScreenshotContent";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { NoDataState } from "./NoDataState";

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
    cancelSelection,
  } = useScreenshotViewerState();

  useScreenshotViewerEffects(
    setScreenshotData,
    setLoading,
    setError,
    setShowSelector,
    loading
  );

  const handleClose = () => {
    window.close();
  };

  // 处理鼠标按下事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!showSelector) return;

    const imgElement = getImageElement();
    if (!imgElement) return;

    const position = getClampedPosition(e.clientX, e.clientY, imgElement);
    setStartPos(position);
    setSelection({ ...position, width: 0, height: 0 });
    setIsSelecting(true);
  }, [showSelector, setStartPos, setSelection, setIsSelecting]);

  // 处理鼠标移动事件
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !showSelector) return;

    const imgElement = getImageElement();
    if (!imgElement) return;

    const currentPos = getClampedPosition(e.clientX, e.clientY, imgElement);
    const newSelection = calculateSelection(currentPos, startPos);
    setSelection(newSelection);
  }, [isSelecting, showSelector, startPos, setSelection]);

  // 处理鼠标松开事件
  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !showSelector) return;

    setIsSelecting(false);

    // 如果选择区域太小，忽略
    if (!isValidSelection(selection)) {
      resetSelection();
      return;
    }

    console.log("选择区域:", selection);
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

      console.log("原始图片尺寸:", originalWidth, "x", originalHeight);
      console.log("显示尺寸:", displayWidth, "x", displayHeight);
      console.log("选择区域(显示坐标):", selection);
      console.log("选择区域(原始坐标):", cropCoords);

      try {
        const selectedImageData = await cropImage(screenshotData.thumbnail, cropCoords);
        console.log("选中内容数据:", selectedImageData);

        saveSelectedImage(selectedImageData, cropCoords.width, cropCoords.height);

        // 关闭当前窗口
        window.close();
      } catch (error) {
        console.error("裁剪图片失败:", error);
      }
    };

    img.src = screenshotData.thumbnail;
  }, [screenshotData, selection]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onClose={handleClose} />;
  }

  if (!screenshotData) {
    return <NoDataState onClose={handleClose} />;
  }

  return (
    <div className="screenshot-viewer">
      <ScreenshotHeader
        screenshotData={screenshotData}
        showSelector={showSelector}
        onCancelSelection={cancelSelection}
        onClose={handleClose}
      />
      <ScreenshotContent
        screenshotData={screenshotData}
        showSelector={showSelector}
        selection={selection}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}; 
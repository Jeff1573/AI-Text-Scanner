import { useCallback, useEffect, useState } from "react";
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
import { FloatingToolbar } from "./FloatingToolbar";
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

  const [showToolbar, setShowToolbar] = useState(false);

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
      window.electronAPI
        .openHtmlViewer(analysisResult, "AI 分析结果")
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

  const handleCancel = useCallback(() => {
    resetSelection();
    setShowToolbar(false);
  }, [resetSelection]);

  // 处理复制成功后的回调：关闭截图窗口但不显示主窗口
  const handleCopySuccess = useCallback(() => {
    try {
      // 使用 IPC 方法关闭截图窗口，不显示主窗口
      window.electronAPI.closeScreenshotWindowWithoutShowingMain();
    } catch (error) {
      console.error("关闭窗口失败:", error);
      // 如果 IPC 调用失败，使用原生 window.close() 作为备选方案
      window.close();
    }
  }, []);

  // 复制选中区域图片到剪切板
  const handleCopySelectedImage = useCallback(async (): Promise<void> => {
    if (!screenshotData) {
      throw new Error("没有截图数据");
    }
    
    return new Promise<void>((resolve, reject) => {
      try {
        const imgElement = getImageElement();
        if (!imgElement) {
          reject(new Error("找不到图片元素"));
          return;
        }
        
        const displayRect = imgElement.getBoundingClientRect();
        const img = new Image();
        
        img.onload = async () => {
          try {
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
            
            const selectedImageData = await cropImage(
              screenshotData.thumbnail,
              cropCoords
            );
            
            // 检查浏览器是否支持剪切板API
            if (!navigator.clipboard || !navigator.clipboard.write) {
              reject(new Error("您的浏览器不支持复制图片到剪切板"));
              return;
            }

            // 将base64图片转换为Blob
            const response = await fetch(selectedImageData);
            const blob = await response.blob();
            
            // 创建ClipboardItem
            const clipboardItem = new ClipboardItem({
              [blob.type]: blob
            });
            
            // 写入剪切板
            await navigator.clipboard.write([clipboardItem]);
            
            console.log("图片已复制到剪切板");
            resolve();
            
          } catch (error) {
            console.error("复制图片失败:", error);
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error("图片加载失败"));
        };
        
        img.src = screenshotData.thumbnail;
      } catch (error) {
        console.error("复制选中区域失败:", error);
        reject(error);
      }
    });
  }, [screenshotData, selection]);

  // 支持按 ESC 关闭窗口
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showToolbar) {
          handleCancel();
        } else {
          window.close();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showToolbar) {
        const toolbar = document.querySelector(".floating-toolbar");
        if (toolbar && !toolbar.contains(e.target as Node)) {
          handleCancel();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToolbar, handleCancel]);

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!showSelector || showToolbar) return;
      const imgElement = getImageElement();
      if (!imgElement) return;
      const position = getClampedPosition(e.clientX, e.clientY, imgElement);
      setStartPos(position);
      setSelection({ ...position, width: 0, height: 0 });
      setIsSelecting(true);
    },
    [showSelector, showToolbar, setStartPos, setSelection, setIsSelecting]
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
    if (isValidSelection(selection)) {
      setShowToolbar(true);
    } else {
      resetSelection();
    }
  }, [isSelecting, showSelector, selection, setIsSelecting, resetSelection]);

  // 获取选中内容
  const handleGetSelectedContent = useCallback(async () => {
    if (!screenshotData) return;
    setShowToolbar(false);
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
    // 隐藏窗口
    try {
      // 使用 windowClose 方法关闭当前截图窗口
      await window.electronAPI.windowMinimize();
    } catch (error) {
      console.error("隐藏窗口失败:", error);
      // 如果IPC调用失败，使用原生window.close()作为备选方案
      window.close();
    }
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

        {showToolbar && (
          <FloatingToolbar
            onConfirm={handleGetSelectedContent}
            onCancel={handleCancel}
            onCopy={handleCopySelectedImage}
            onCopySuccess={handleCopySuccess}
            selection={selection}
          />
        )}

        {/* {isAnalyzing && (
          <>
            <div className="stage-dim"></div>
            <div className="analysis-inline-overlay">
              <div className="loading-spinner"></div>
              <h3>正在识别中...</h3>
              <p>请稍候，AI正在分析您选择的区域</p>
            </div>
          </>
        )} */}
      </div>
    </div>
  );
};

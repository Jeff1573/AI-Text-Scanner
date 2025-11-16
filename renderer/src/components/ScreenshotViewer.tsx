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
    resetSelection,
    setShowToolbar,
    loading
  );

  // 截图路由挂载时为 body 添加类，强制背景为黑，避免可见第一帧出现白底
  useEffect(() => {
    try {
      document.body.classList.add("screenshot-route");
      return () => document.body.classList.remove("screenshot-route");
    } catch (error) {
      console.error("设置截图路由样式失败", error);
    }
  }, []);

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
          try {
            // 通过主进程标志控制：关闭截图窗口但不显示主窗口
            window.electronAPI.closeScreenshotWindowWithoutShowingMain();
          } catch (error) {
            console.error("IPC 关闭截图窗口失败，使用回退方案:", error);
            window.close();
          }
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

  // 处理贴图功能
  const handleSticker = useCallback(async () => {
    if (!screenshotData) return;

    try {
      const imgElement = getImageElement();
      if (!imgElement) {
        alert("找不到图片元素");
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

          // 创建贴图窗口
          await window.electronAPI.createStickerWindow(
            selectedImageData,
            cropCoords.width,
            cropCoords.height
          );

          // 贴图后隐藏截图窗口
          try {
            await window.electronAPI.windowHide();
          } catch (hideError) {
            console.error("隐藏截图窗口失败:", hideError);
          }

          // 重置选区
          resetSelection();
          setShowToolbar(false);

        } catch (error) {
          console.error("创建贴图失败:", error);
          alert("创建贴图失败，请重试");
        }
      };

      img.onerror = () => {
        alert("图片加载失败");
      };

      img.src = screenshotData.thumbnail;

    } catch (error) {
      console.error("贴图功能失败:", error);
      alert("贴图功能失败，请重试");
    }
  }, [screenshotData, selection, resetSelection]);

  // 获取选中内容
  const handleGetSelectedContent = useCallback(async () => {
    if (!screenshotData) return;
    const selectionSnapshot = { ...selection };
    setShowToolbar(false);
    setShowSelector(false);
    resetSelection();
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
        selectionSnapshot,
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
        // 清理上次识别结果，避免新会话读取旧内容
        try {
          localStorage.removeItem("latestAnalysisResult");
          localStorage.removeItem("latestAnalysisTimestamp");
        } catch (storageError) {
          console.warn("清理本地识别结果缓存失败", storageError);
        }
        saveSelectedImage(
          selectedImageData,
          cropCoords.width,
          cropCoords.height
        );
        // 打开主窗口并导航到图片分析页面（左侧展示选中图片，右侧显示加载）
        try {
          await window.electronAPI.openMainWindowWithRoute("/image-analysis");
        } catch (navErr) {
          console.error("导航到分析页面失败:", navErr);
        }
      } catch (error) {
        alert("裁剪图片失败，请重试");
        resetSelection();
      }
    };
    img.src = screenshotData.thumbnail;
    // 隐藏窗口
    try {
      // 隐藏当前截图窗口（而非最小化/关闭）
      await window.electronAPI.windowHide();
    } catch (hideError) {
      console.error("隐藏窗口失败:", hideError);
      // 如果IPC调用失败，使用原生window.close()作为备选方案
      window.close();
    }
  }, [screenshotData, selection, resetSelection, setShowSelector]);

  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorState error={error} />;
  }
  // 当未收到截图数据时不渲染任何内容；窗口将在图片就绪后才显示
  if (!screenshotData) {
    return null;
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
            onSticker={handleSticker}
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

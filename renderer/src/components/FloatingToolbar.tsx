import React, { useState } from "react";
import "../assets/styles/floating-toolbar.css";

/**
 * 浮动工具栏组件属性
 */
interface FloatingToolbarProps {
  onConfirm: () => void;
  onCancel: () => void;
  /** 复制选中区域图片到剪切板 */
  onCopy: () => Promise<void>;
  /** 复制成功后的回调函数，用于关闭截图窗口或预览窗口 */
  onCopySuccess?: () => void;
  /** 贴图功能（可选） */
  onSticker?: () => void;
  /** 工具栏锚点位置，用于 selection 模式 */
  selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /**
   * 布局模式：
   * - 'selection'：跟随选区右下角（默认，用于截图选择界面）
   * - 'imageBottom'：居中固定在容器底部（用于整图预览界面）
   */
  positionMode?: "selection" | "imageBottom";
}

/**
 * 截图操作浮动工具栏。
 *
 * 根据 positionMode 决定布局：
 * - selection：工具栏跟随选区移动；
 * - imageBottom：工具栏固定在图片容器底部居中。
 */
export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onConfirm,
  onCancel,
  onCopy,
  onCopySuccess,
  onSticker,
  selection,
  positionMode = "selection",
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (isCopying) return;
    
    setIsCopying(true);
    try {
      await onCopy();
      setCopySuccess(true);
      
      // 复制成功后，延迟1秒关闭截图窗口（给用户时间看到成功提示）
      setTimeout(() => {
        setCopySuccess(false);
        onCopySuccess?.();
      }, 1000);
    } catch (error) {
      console.error("复制失败:", error);
    } finally {
      setIsCopying(false);
    }
  };

  const baseToolbarStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 1000,
  };

  const toolbarStyle: React.CSSProperties =
    positionMode === "selection"
      ? {
          ...baseToolbarStyle,
          left: `${selection.x + selection.width - 10}px`,
          top: `${selection.y + selection.height + 10}px`,
        }
      : {
          ...baseToolbarStyle,
          left: "50%",
          bottom: "0px",
          transform: "translateX(-50%)",
        };

  return (
    <>
      <div className="floating-toolbar" style={toolbarStyle}>
        <button onClick={onCancel} className="toolbar-button cancel">
          <span className="toolbar-icon">❌</span>
          {/* <span className="toolbar-text">取消</span> */}
        </button>
        <button
          onClick={handleCopy}
          className={`toolbar-button copy ${copySuccess ? 'success' : ''}`}
          disabled={isCopying}
        >
          <span className="toolbar-icon">
            {isCopying ? "⏳" : "📋"}
          </span>
          {/* <span className="toolbar-text">复制</span> */}
        </button>
        {onSticker && (
          <button onClick={onSticker} className="toolbar-button sticker">
            <span className="toolbar-icon">📌</span>
            {/* <span className="toolbar-text">贴图</span> */}
          </button>
        )}
        <button onClick={onConfirm} className="toolbar-button confirm">
          <span className="toolbar-icon">✅</span>
          {/* <span className="toolbar-text">确认</span> */}
        </button>
      </div>
      
      {copySuccess && (
        <div
          className="copy-success-tooltip"
          style={
            positionMode === "selection"
              ? {
                  position: "absolute",
                  left: `${selection.x + selection.width / 2}px`,
                  top: `${selection.y - 40}px`,
                  zIndex: 1001,
                }
              : {
                  position: "absolute",
                  left: "50%",
                  bottom: "80px",
                  transform: "translateX(-50%)",
                  zIndex: 1001,
                }
          }
        >
          图片已复制到剪切板
        </div>
      )}
    </>
  );
};

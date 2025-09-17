import React, { useState } from "react";
import "../assets/styles/floating-toolbar.css";

interface FloatingToolbarProps {
  onConfirm: () => void;
  onCancel: () => void;
  /** 复制选中区域图片到剪切板 */
  onCopy: () => Promise<void>;
  /** 复制成功后的回调函数，用于关闭截图窗口 */
  onCopySuccess?: () => void;
  selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onConfirm,
  onCancel,
  onCopy,
  onCopySuccess,
  selection,
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

  const toolbarStyle: React.CSSProperties = {
    position: "absolute",
    left: `${selection.x + selection.width - 10}px`,
    top: `${selection.y + selection.height + 10}px`, // 10px offset
    zIndex: 1000,
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
        <button onClick={onConfirm} className="toolbar-button confirm">
          <span className="toolbar-icon">✅</span>
          {/* <span className="toolbar-text">确认</span> */}
        </button>
      </div>
      
      {copySuccess && (
        <div 
          className="copy-success-tooltip" 
          style={{
            position: "absolute",
            left: `${selection.x + selection.width / 2}px`,
            top: `${selection.y - 40}px`,
            zIndex: 1001,
          }}
        >
          图片已复制到剪切板
        </div>
      )}
    </>
  );
};
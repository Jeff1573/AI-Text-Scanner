import React, { useEffect, useState, useRef } from "react";
import { CloseOutlined, UndoOutlined } from "@ant-design/icons";
import "./StickerWindow.css";

interface StickerData {
  imageData: string;
  width: number;
  height: number;
}

const StickerWindow: React.FC = () => {
  const [stickerData, setStickerData] = useState<StickerData | null>(null);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 监听贴图数据
    window.electronAPI.onStickerData((data: StickerData) => {
      console.log("收到贴图数据", data);
      setStickerData(data);
    });

    return () => {
      window.electronAPI.removeStickerDataListener();
    };
  }, []);

  // ESC 键关闭窗口
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 监听 scale 变化，调整窗口大小（防抖）
  useEffect(() => {
    if (!stickerData) return;

    // 清除之前的定时器
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // 设置新的定时器
    resizeTimeoutRef.current = setTimeout(() => {
      const newWidth = Math.round(stickerData.width * scale);
      const newHeight = Math.round(stickerData.height * scale);
      window.electronAPI.resizeStickerWindow(newWidth, newHeight);
    }, 300);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [scale, stickerData]);

  const handleClose = () => {
    window.electronAPI.closeStickerWindow();
  };

  const handleReset = () => {
    setScale(1);
  };

  // 鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1; // 向下滚缩小，向上滚放大
    setScale((prev) => {
      const newScale = prev + delta;
      return Math.max(0.3, Math.min(3, newScale)); // 限制在 0.3 - 3.0 之间
    });
  };

  if (!stickerData) {
    return (
      <div className="sticker-window loading">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  return (
    <div className="sticker-window" onWheel={handleWheel}>
      {/* 拖动区域 */}
      <div className="sticker-drag-area" />

      {/* 图片容器 */}
      <div className="sticker-image-container">
        <img
          ref={imgRef}
          src={stickerData.imageData}
          alt="Sticker"
          className="sticker-image"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      </div>

      {/* 控制栏 */}
      <div className="sticker-controls">
        <button
          className="sticker-control-btn"
          onClick={handleReset}
          title="重置大小 (1:1)"
        >
          <UndoOutlined />
        </button>
        <button
          className="sticker-control-btn close-btn"
          onClick={handleClose}
          title="关闭 (ESC)"
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  );
};

export default StickerWindow;

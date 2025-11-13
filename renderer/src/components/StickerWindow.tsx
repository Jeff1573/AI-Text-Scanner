import React, { useEffect, useState } from "react";
import { CloseOutlined, UndoOutlined } from "@ant-design/icons";
import "./StickerWindow.css";

interface StickerData {
  imageData: string;
  width: number;
  height: number;
}

const StickerWindow: React.FC = () => {
  const [stickerData, setStickerData] = useState<StickerData | null>(null);

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

  // ESC 关闭窗口
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 容器级滚轮缩放（避免 drag 区域拦截）
  const handleWheel: React.WheelEventHandler = (e) => {
    e.preventDefault();
    window.electronAPI.scaleStickerWindow(e.deltaY);
  };

  const handleClose = () => {
    console.log("关闭贴图窗口");
    window.electronAPI.closeStickerWindow();
  };

  const handleReset = () => {
    console.log("重置窗口大小");
    window.electronAPI.resetStickerWindow();
  };

  if (!stickerData) {
    return (
      <div className="sticker-window loading">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  return (
    <div className="sticker-window">
      {/* 顶部拖拽条 */}
      <div className="sticker-drag-area" />

      {/* 图片区域（允许滚轮） */}
      <div className="sticker-image-container" onWheel={handleWheel}>
        <img
          src={stickerData.imageData}
          alt="Sticker"
          className="sticker-image"
        />
      </div>

      {/* 控制条 */}
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


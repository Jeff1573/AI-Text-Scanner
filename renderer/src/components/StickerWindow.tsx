import React, { useEffect, useState, useRef } from "react";
import { CloseOutlined, ZoomInOutlined, ZoomOutOutlined, UndoOutlined } from "@ant-design/icons";
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

  const handleClose = () => {
    window.electronAPI.closeStickerWindow();
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setScale(1);
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
          onClick={handleZoomOut}
          title="缩小"
        >
          <ZoomOutOutlined />
        </button>
        <button
          className="sticker-control-btn"
          onClick={handleReset}
          title="重置"
        >
          <UndoOutlined />
        </button>
        <button
          className="sticker-control-btn"
          onClick={handleZoomIn}
          title="放大"
        >
          <ZoomInOutlined />
        </button>
        <button
          className="sticker-control-btn close-btn"
          onClick={handleClose}
          title="关闭"
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  );
};

export default StickerWindow;

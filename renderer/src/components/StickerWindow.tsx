import React, { useEffect, useRef, useState } from "react";
import { CloseOutlined, UndoOutlined } from "@ant-design/icons";
import "./StickerWindow.css";

interface StickerData {
  imageData: string;
  width: number;
  height: number;
}

const StickerWindow: React.FC = () => {
  const [stickerData, setStickerData] = useState<StickerData | null>(null);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafPendingRef = useRef(false);

  useEffect(() => {
    // 贴图窗口挂载时，禁止页面滚动并移除最小尺寸限制，避免出现滚动条
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      minWidth: body.style.minWidth,
      minHeight: body.style.minHeight,
      display: body.style.display,
      background: body.style.background,
    };

    body.classList.add("sticker-window-mode");
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.minWidth = "0";
    body.style.minHeight = "0";
    body.style.display = "block";
    body.style.background = "transparent";

    return () => {
      // 恢复原样式，避免影响其它路由
      body.classList.remove("sticker-window-mode");
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.minWidth = prev.minWidth;
      body.style.minHeight = prev.minHeight;
      body.style.display = prev.display;
      body.style.background = prev.background;
    };
  }, []);

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

  // 窗口失焦或隐藏时结束拖拽（兜底处理）
  useEffect(() => {
    const handleBlur = () => {
      if (dragging) {
        setDragging(false);
        rafPendingRef.current = false;
        window.electronAPI.endStickerDrag();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && dragging) {
        setDragging(false);
        rafPendingRef.current = false;
        window.electronAPI.endStickerDrag();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dragging]);

  // 容器级滚轮缩放（围绕鼠标锚点）
  const handleWheel: React.WheelEventHandler = (e) => {
    e.preventDefault();
    window.electronAPI.scaleStickerWindow(e.deltaY, {
      x: e.clientX,
      y: e.clientY,
      dpr: window.devicePixelRatio,
    });
  };

  // 自定义拖拽（整图可拖，控制条除外）
  const beginDrag: React.PointerEventHandler = (e) => {
    // 仅响应左键
    if (e.button !== 0) return;

    // 排除控制按钮区域
    if ((e.target as HTMLElement)?.closest(".sticker-controls")) return;

    containerRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    window.electronAPI.beginStickerDrag();
  };

  const tickDrag = () => {
    rafPendingRef.current = false;
    window.electronAPI.dragStickerWindow();
  };

  const onPointerMove: React.PointerEventHandler = () => {
    if (!dragging) return;
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(tickDrag);
  };

  const endDrag: React.PointerEventHandler = (e) => {
    if (!dragging) return;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // 忽略释放捕获失败的错误
    }
    setDragging(false);
    rafPendingRef.current = false;
    window.electronAPI.endStickerDrag();
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
    <div className={`sticker-window ${dragging ? "dragging" : ""}`}>
      {/* 图片区域（可拖拽、可滚轮缩放） */}
      <div
        ref={containerRef}
        className="sticker-image-container"
        onWheel={handleWheel}
        onPointerDown={beginDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
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

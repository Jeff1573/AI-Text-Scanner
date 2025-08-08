import type { ScreenSource } from "../types/electron";

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotContentProps {
  screenshotData: ScreenSource;
  showSelector: boolean;
  selection: Selection;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

export const ScreenshotContent = ({
  screenshotData,
  showSelector,
  selection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: ScreenshotContentProps) => {
  return (
    <div
      className="screenshot-content"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ cursor: showSelector ? "crosshair" : "default" }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          src={screenshotData.thumbnail}
          alt={screenshotData.name}
          className="screenshot-image"
          onLoad={() => {
            console.log("图片加载成功");
            // 通知主进程：首帧已渲染，可显示窗口
            if (window.electronAPI?.notifyScreenshotReady) {
              window.electronAPI.notifyScreenshotReady();
            }
          }}
          onError={(e) => console.error("图片加载失败:", e)}
          style={{ maxWidth: "100%", height: "auto" }}
        />

        {/* 选择框 */}
        {showSelector && selection.width > 0 && selection.height > 0 && (
          <div
            className="selection-box"
            style={{
              position: "absolute",
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
              border: "2px solid #007bff",
              backgroundColor: "rgba(0, 123, 255, 0.2)",
              pointerEvents: "none",
              zIndex: 1000,
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      {/* 选择提示 */}
      {showSelector && selection.width === 0 && selection.height === 0 && (
        <div className="selection-hint">拖拽鼠标选择区域</div>
      )}
    </div>
  );
}; 
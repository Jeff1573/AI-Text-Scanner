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
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <img
          src={screenshotData.thumbnail}
          alt={screenshotData.name}
          className="screenshot-image"
          onLoad={() => {
            console.log("图片加载成功");
            // 双 RAF 确保首帧已提交再通知主进程显示窗口，避免白闪一帧
            if (window.electronAPI?.notifyScreenshotReady) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  window.electronAPI.notifyScreenshotReady();
                });
              });
            }
          }}
          onError={(e) => console.error("图片加载失败:", e)}
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

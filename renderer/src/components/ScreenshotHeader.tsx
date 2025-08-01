import type { ScreenSource } from "../types/electron";

interface ScreenshotHeaderProps {
  screenshotData: ScreenSource;
  showSelector: boolean;
  onCancelSelection: () => void;
  onClose: () => void;
}

export const ScreenshotHeader = ({
  screenshotData,
  showSelector,
  onCancelSelection,
  onClose,
}: ScreenshotHeaderProps) => {
  return (
    <div className="screenshot-header">
      <h2>{screenshotData.name}</h2>
      <div className="header-controls">
        {showSelector && (
          <button onClick={onCancelSelection} className="cancel-btn">
            取消选择
          </button>
        )}
        <button onClick={onClose} className="close-btn">
          关闭
        </button>
      </div>
    </div>
  );
}; 
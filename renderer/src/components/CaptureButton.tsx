interface CaptureButtonProps {
  isCapturing: boolean;
  onCapture: () => void;
}

export const CaptureButton = ({ isCapturing, onCapture }: CaptureButtonProps) => {
  return (
    <div className="controls">
      <button
        onClick={onCapture}
        disabled={isCapturing}
        className="capture-btn"
      >
        {isCapturing ? "截图中..." : "获取屏幕截图"}
      </button>
    </div>
  );
}; 
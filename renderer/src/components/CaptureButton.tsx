import "../assets/styles/capture-button.css";

interface CaptureButtonProps {
  isCapturing: boolean;
  onCapture: () => void;
}

export const CaptureButton = ({ isCapturing, onCapture }: CaptureButtonProps) => {
  return (
    <div className="screenshot-button" onClick={onCapture}>
      <div className="button-icon">📸</div>
      <div className="button-text">
        {isCapturing ? "截图中..." : "截图识别"}
      </div>
      <div className="button-description">
        点击按钮开始截图，选择区域后自动识别文字
      </div>
    </div>
  );
}; 
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // 监听截图完成事件
  useEffect(() => {
    const removeListener = window.electronAPI.onScreenCaptureComplete((imagePath) => {
      setCapturedImage(imagePath);
    });

    return () => {
      removeListener();
    };
  }, []);

  // 开始截图
  const handleStartCapture = async () => {
    try {
      await window.electronAPI.startScreenCapture();
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  return (
    <div className="app-container">
      <h1>快速屏幕截图工具</h1>
      
      <div className="actions">
        <button className="capture-btn" onClick={handleStartCapture}>
          开始截图
        </button>
      </div>
      
      {capturedImage && (
        <div className="preview-container">
          <h2>最近截图:</h2>
          <div className="image-preview">
            <img src={`file://${capturedImage}`} alt="截图预览" />
            <p className="image-path">{capturedImage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

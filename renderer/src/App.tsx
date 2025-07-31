import { useState, useRef } from 'react'
import './App.css'

// 声明electronAPI类型
declare global {
  interface Window {
    electronAPI: {
      captureScreen: (options?: Record<string, unknown>) => Promise<{
        success: boolean;
        sources?: Array<{
          id: string;
          name: string;
          thumbnail: string;
        }>;
        error?: string;
      }>;
    };
  }
}

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface CaptureResult {
  success: boolean;
  sources?: ScreenSource[];
  error?: string;
}

function App() {
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 获取屏幕截图
  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const result = await window.electronAPI.captureScreen();
      setCaptureResult(result);
      if (result.success && result.sources && result.sources.length > 0) {
        setSelectedSource(result.sources[0]);
      }
    } catch (error) {
      setCaptureResult({
        success: false,
        error: `截图失败: ${error}`
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // 保存截图到本地
  const handleSaveScreenshot = () => {
    if (selectedSource && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      
      img.src = selectedSource.thumbnail;
    }
  };

  return (
    <div className="app">
      <h1>屏幕截图工具</h1>
      
      <div className="controls">
        <button 
          onClick={handleCaptureScreen} 
          disabled={isCapturing}
          className="capture-btn"
        >
          {isCapturing ? '截图中...' : '获取屏幕截图'}
        </button>
        
        {selectedSource && (
          <button onClick={handleSaveScreenshot} className="save-btn">
            保存截图
          </button>
        )}
      </div>

      {captureResult && (
        <div className="result">
          {captureResult.success ? (
            <div className="sources">
              <h3>可用屏幕:</h3>
              {captureResult.sources?.map((source) => (
                <div 
                  key={source.id} 
                  className={`source-item ${selectedSource?.id === source.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSource(source)}
                >
                  <img 
                    src={source.thumbnail} 
                    alt={source.name}
                    className="source-thumbnail"
                  />
                  <p>{source.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="error">
              <p>错误: {captureResult.error}</p>
            </div>
          )}
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default App

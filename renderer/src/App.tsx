import { useState, useEffect } from 'react'
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
      createScreenshotWindow: (screenshotData: ScreenSource) => Promise<{
        success: boolean;
        error?: string;
      }>;
      onScreenshotData: (callback: (data: ScreenSource) => void) => void;
      removeScreenshotDataListener: () => void;
    };
  }
}

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

// 主应用组件
function MainApp() {
  const [isCapturing, setIsCapturing] = useState(false);

  // 获取屏幕截图并直接在新窗口中显示
  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const result = await window.electronAPI.captureScreen();
      
      if (result.success && result.sources && result.sources.length > 0) {
        // 直接使用第一个屏幕的截图创建新窗口
        const firstSource = result.sources[0];
        await window.electronAPI.createScreenshotWindow(firstSource);
      } else {
        console.error('截图失败:', result.error);
        alert(`截图失败: ${result.error}`);
      }
    } catch (error) {
      console.error('截图失败:', error);
      alert(`截图失败: ${error}`);
    } finally {
      setIsCapturing(false);
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
      </div>

      <div className="info">
        <p>点击按钮获取屏幕截图，将自动在新窗口中全屏显示</p>
      </div>
    </div>
  )
}

// 截图展示组件
function ScreenshotViewer() {
  const [screenshotData, setScreenshotData] = useState<ScreenSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('ScreenshotViewer 组件挂载');
    console.log('当前URL hash:', window.location.hash);
    
    // 监听截图数据
    const handleScreenshotData = (data: ScreenSource) => {
      console.log('收到截图数据:', data);
      setScreenshotData(data);
      setLoading(false);
      setError(null);
    };

    // 注册监听器
    console.log('注册截图数据监听器');
    window.electronAPI.onScreenshotData(handleScreenshotData);

    // 设置超时，如果10秒内没有收到数据，显示错误
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('数据接收超时');
        setError('数据接收超时，请重试');
        setLoading(false);
      }
    }, 10000);

    // 清理监听器
    return () => {
      console.log('ScreenshotViewer 组件卸载');
      window.electronAPI.removeScreenshotDataListener();
      clearTimeout(timeout);
    };
  }, [loading]);

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="screenshot-viewer loading">
        <div className="loading-spinner">加载中...</div>
        <div style={{ color: '#fff', marginTop: '1rem' }}>
          等待截图数据...
        </div>
        <div style={{ color: '#fff', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          当前URL: {window.location.href}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screenshot-viewer loading">
        <div style={{ color: '#dc3545', fontSize: '1.2rem' }}>
          错误: {error}
        </div>
        <div style={{ color: '#fff', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          当前URL: {window.location.href}
        </div>
        <button 
          onClick={handleClose} 
          style={{ 
            marginTop: '1rem', 
            padding: '8px 16px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          关闭
        </button>
      </div>
    );
  }

  if (!screenshotData) {
    return (
      <div className="screenshot-viewer loading">
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>
          未收到截图数据
        </div>
        <div style={{ color: '#fff', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          当前URL: {window.location.href}
        </div>
        <button 
          onClick={handleClose} 
          style={{ 
            marginTop: '1rem', 
            padding: '8px 16px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          关闭
        </button>
      </div>
    );
  }

  return (
    <div className="screenshot-viewer">
      <div className="screenshot-header">
        <h2>{screenshotData.name}</h2>
        <button onClick={handleClose} className="close-btn">
          关闭
        </button>
      </div>
      <div className="screenshot-content">
        <img 
          src={screenshotData.thumbnail} 
          alt={screenshotData.name}
          className="screenshot-image"
          onLoad={() => console.log('图片加载成功')}
          onError={(e) => console.error('图片加载失败:', e)}
        />
      </div>
    </div>
  );
}

// 路由组件
function App() {
  const [currentRoute, setCurrentRoute] = useState('main');

  useEffect(() => {
    // 根据URL hash确定当前路由
    const hash = window.location.hash.slice(1);
    if (hash === '/screenshot') {
      setCurrentRoute('screenshot');
    } else {
      setCurrentRoute('main');
    }
  }, []);

  if (currentRoute === 'screenshot') {
    return <ScreenshotViewer />;
  }

  return <MainApp />;
}

export default App

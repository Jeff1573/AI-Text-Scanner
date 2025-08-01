import { useState, useEffect } from 'react'
import './App.css'
import type { ScreenSource } from './types/electron'

// 主应用组件
function MainApp() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageInfo, setSelectedImageInfo] = useState<{ width: number; height: number } | null>(null);

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

  // 监听选中图片数据
  useEffect(() => {
    // 从localStorage读取之前保存的选中图片数据
    const savedImageData = localStorage.getItem('selectedImageData');
    const savedImageInfo = localStorage.getItem('selectedImageInfo');
    
    if (savedImageData && savedImageInfo) {
      setSelectedImage(savedImageData);
      setSelectedImageInfo(JSON.parse(savedImageInfo));
    }

    // 监听窗口焦点事件，检查是否有新的选中图片数据
    const handleWindowFocus = () => {
      const newImageData = localStorage.getItem('selectedImageData');
      const newImageInfo = localStorage.getItem('selectedImageInfo');
      
      if (newImageData && newImageInfo) {
        setSelectedImage(newImageData);
        setSelectedImageInfo(JSON.parse(newImageInfo));
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // 清除选中图片
  const handleClearSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageInfo(null);
    localStorage.removeItem('selectedImageData');
    localStorage.removeItem('selectedImageInfo');
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
        <p>选择区域后，选中的图片将显示在主界面中</p>
      </div>

      {/* 选中图片显示区域 */}
      {selectedImage && (
        <div className="selected-image-container">
          <div className="selected-image-header">
            <h3>选中的图片</h3>
            <button onClick={handleClearSelectedImage} className="clear-btn">
              清除
            </button>
          </div>
          <div className="selected-image-content">
            <img 
              src={selectedImage} 
              alt="选中的图片"
              className="selected-image"
            />
            {selectedImageInfo && (
              <div className="selected-image-info">
                <p>尺寸: {selectedImageInfo.width} x {selectedImageInfo.height} 像素</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 截图展示组件
function ScreenshotViewer() {
  const [screenshotData, setScreenshotData] = useState<ScreenSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.log('ScreenshotViewer 组件挂载');
    console.log('当前URL hash:', window.location.hash);
    
    // 监听截图数据
    const handleScreenshotData = (data: ScreenSource) => {
      console.log('收到截图数据:', data);
      setScreenshotData(data);
      setLoading(false);
      setError(null);
      // 显示截图后自动显示选择器
      setTimeout(() => setShowSelector(true), 1000);
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

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showSelector) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const imgElement = document.querySelector('.screenshot-image') as HTMLImageElement;
    if (!imgElement) return;
    
    const imgRect = imgElement.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // 确保坐标在图片范围内
    const clampedX = Math.max(0, Math.min(x, imgRect.width));
    const clampedY = Math.max(0, Math.min(y, imgRect.height));
    
    setStartPos({ x: clampedX, y: clampedY });
    setSelection({ x: clampedX, y: clampedY, width: 0, height: 0 });
    setIsSelecting(true);
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !showSelector) return;
    
    const imgElement = document.querySelector('.screenshot-image') as HTMLImageElement;
    if (!imgElement) return;
    
    const imgRect = imgElement.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // 确保坐标在图片范围内
    const clampedX = Math.max(0, Math.min(x, imgRect.width));
    const clampedY = Math.max(0, Math.min(y, imgRect.height));
    
    const width = clampedX - startPos.x;
    const height = clampedY - startPos.y;
    
    setSelection({
      x: width < 0 ? clampedX : startPos.x,
      y: height < 0 ? clampedY : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  // 处理鼠标松开事件
  const handleMouseUp = () => {
    if (!isSelecting || !showSelector) return;
    
    setIsSelecting(false);
    
    // 如果选择区域太小，忽略
    if (selection.width < 10 || selection.height < 10) {
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }
    
    console.log('选择区域:', selection);
    // 这里可以添加获取选中内容的逻辑
    handleGetSelectedContent();
  };

  // 获取选中内容
  const handleGetSelectedContent = async () => {
    if (!screenshotData) return;

    // 创建canvas来裁剪图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      // 获取图片在页面中的实际显示尺寸
      const imgElement = document.querySelector('.screenshot-image') as HTMLImageElement;
      if (!imgElement) return;

      const displayRect = imgElement.getBoundingClientRect();
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const displayWidth = displayRect.width;
      const displayHeight = displayRect.height;

      // 计算缩放比例
      const scaleX = originalWidth / displayWidth;
      const scaleY = originalHeight / displayHeight;

      // 将选择坐标转换为原始图片坐标
      const originalX = Math.round(selection.x * scaleX);
      const originalY = Math.round(selection.y * scaleY);
      const originalWidth_crop = Math.round(selection.width * scaleX);
      const originalHeight_crop = Math.round(selection.height * scaleY);

      // 确保裁剪区域不超出图片边界
      const finalX = Math.max(0, Math.min(originalX, originalWidth - 1));
      const finalY = Math.max(0, Math.min(originalY, originalHeight - 1));
      const finalWidth = Math.min(originalWidth_crop, originalWidth - finalX);
      const finalHeight = Math.min(originalHeight_crop, originalHeight - finalY);

      console.log('原始图片尺寸:', originalWidth, 'x', originalHeight);
      console.log('显示尺寸:', displayWidth, 'x', displayHeight);
      console.log('缩放比例:', scaleX, scaleY);
      console.log('选择区域(显示坐标):', selection);
      console.log('选择区域(原始坐标):', { x: finalX, y: finalY, width: finalWidth, height: finalHeight });

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // 绘制选中区域
      ctx?.drawImage(
        img,
        finalX, finalY, finalWidth, finalHeight,
        0, 0, finalWidth, finalHeight
      );

      // 获取选中内容的数据URL
      const selectedImageData = canvas.toDataURL('image/png');
      console.log('选中内容数据:', selectedImageData);

      // 保存选中图片数据到localStorage
      localStorage.setItem('selectedImageData', selectedImageData);
      localStorage.setItem('selectedImageInfo', JSON.stringify({
        width: finalWidth,
        height: finalHeight
      }));

      // 关闭当前窗口
      window.close();
    };

    img.src = screenshotData.thumbnail;
  };

  // 取消选择
  const handleCancelSelection = () => {
    setShowSelector(false);
    setSelection({ x: 0, y: 0, width: 0, height: 0 });
    setIsSelecting(false);
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
        <div className="header-controls">
          {showSelector && (
            <button onClick={handleCancelSelection} className="cancel-btn">
              取消选择
            </button>
          )}
          <button onClick={handleClose} className="close-btn">
            关闭
          </button>
        </div>
      </div>
      <div 
        className="screenshot-content"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: showSelector ? 'crosshair' : 'default' }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img 
            src={screenshotData.thumbnail} 
            alt={screenshotData.name}
            className="screenshot-image"
            onLoad={() => console.log('图片加载成功')}
            onError={(e) => console.error('图片加载失败:', e)}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          
          {/* 选择框 */}
          {showSelector && selection.width > 0 && selection.height > 0 && (
            <div 
              className="selection-box"
              style={{
                position: 'absolute',
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
                border: '2px solid #007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                pointerEvents: 'none',
                zIndex: 1000,
                boxSizing: 'border-box'
              }}
            />
          )}
        </div>
        
        {/* 选择提示 */}
        {showSelector && selection.width === 0 && selection.height === 0 && (
          <div className="selection-hint">
            拖拽鼠标选择区域
          </div>
        )}
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

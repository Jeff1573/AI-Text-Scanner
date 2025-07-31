import { useEffect, useRef, useState } from 'react';
import './CaptureScreen.css';

interface CaptureScreenData {
  thumbnail: string;
  id: string;
  name: string;
  display_id: string;
  width: number;
  height: number;
}

const CaptureScreen = () => {
  const [screenData, setScreenData] = useState<CaptureScreenData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // 监听截图数据
  useEffect(() => {
    console.log('设置截图数据监听器');
    const removeDataListener = window.electronAPI.onCaptureScreenData((data) => {
      console.log('收到截图数据', data);
      setScreenData(data);
    });
    
    // 监听直接截图模式
    const removeDirectCaptureListener = window.electronAPI.onStartDirectCapture((data) => {
      console.log('启动直接截图模式', data);
      // 直接截图模式不需要加载图像，直接设置为已加载状态
      setIsImageLoaded(true);
    });

    return () => {
      removeDataListener();
      removeDirectCaptureListener();
    };
  }, []);

  // 当获取到截图数据后，加载图像
  useEffect(() => {
    if (screenData) {
      console.log('加载屏幕截图', screenData);
      
      try {
        // 使用直接的方式绘制到Canvas上
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          
          // 创建一个新的Image对象来保存原始图像数据
          const originalImg = new Image();
          originalImg.crossOrigin = 'anonymous'; // 允许跨域图像处理
          
          // 设置图像加载错误处理
          originalImg.onerror = (err) => {
            console.error('图像加载失败:', err);
            alert('截图加载失败，请重试');
            window.close();
          };
          
          // 设置图像加载成功处理
          originalImg.onload = () => {
            console.log('原始图像加载完成', originalImg.width, originalImg.height);
            
            // 保存原始图像引用
            originalImageRef.current = originalImg;
            
            // 直接在这里绘制初始Canvas
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 清除画布
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // 绘制图像
              ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
              console.log('Canvas已初始化', canvas.width, canvas.height);
              
              // 添加调试信息，在画布上显示文本确认图像已加载
              ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
              ctx.font = '20px Arial';
              ctx.fillText('图像已加载 - 请拖动选择区域', 20, 30);
              
              // 设置状态为已加载
              setIsImageLoaded(true);
            }
          };
          
          // 开始加载图像
          console.log('设置图像源:', screenData.thumbnail.substring(0, 50) + '...');
          originalImg.src = screenData.thumbnail;
          
          // 如果图像已经在缓存中，可能不会触发onload事件，所以检查一下
          if (originalImg.complete) {
            console.log('图像已在缓存中，直接触发onload');
            originalImg.onload(new Event('load'));
          }
        }
      } catch (err) {
        console.error('处理截图数据时出错:', err);
        alert('截图处理失败，请重试');
        window.close();
      }
    }
  }, [screenData]);

  // 监听窗口大小变化，重新调整Canvas
  useEffect(() => {
    const handleResize = () => {
      if (isImageLoaded && originalImageRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
            console.log('Canvas已重新调整大小', canvas.width, canvas.height);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isImageLoaded]);

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('鼠标按下', e.clientX, e.clientY);
    
    // 记录起始点
    const newStartPoint = { x: e.clientX, y: e.clientY };
    
    // 更新状态
    setIsDrawing(true);
    setStartPoint(newStartPoint);
    setEndPoint(newStartPoint);
    
    // 立即绘制一个点（可选）
    const canvas = canvasRef.current;
    if (canvas && originalImageRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 先清除画布并重新绘制背景图
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
        
        // 绘制一个小点表示开始位置
        ctx.fillStyle = '#1890ff';
        ctx.beginPath();
        ctx.arc(e.clientX, e.clientY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    // 获取当前鼠标位置
    const newEndPoint = { x: e.clientX, y: e.clientY };
    
    // 直接绘制选择区域，不等待状态更新
    // 这样可以确保选择区域实时跟随鼠标
    requestAnimationFrame(() => {
      drawSelectionRect(newEndPoint);
    });
    
    // 更新状态，以便其他地方使用
    setEndPoint(newEndPoint);
  };

  // 处理鼠标松开事件
  const handleMouseUp = () => {
    if (!isDrawing) return;
    
    console.log('鼠标松开，捕获区域');
    setIsDrawing(false);
    captureSelectedArea();
  };

  // 绘制选择矩形
  const drawSelectionRect = (currentEndPoint = endPoint) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // 清除画布并重新绘制背景图
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
      
      // 计算选择区域
      const x = Math.min(startPoint.x, currentEndPoint.x);
      const y = Math.min(startPoint.y, currentEndPoint.y);
      const width = Math.abs(currentEndPoint.x - startPoint.x);
      const height = Math.abs(currentEndPoint.y - startPoint.y);
      
      console.log('绘制选择区域:', x, y, width, height);
      
      // 绘制半透明遮罩
      // ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      // ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 清除选择区域的遮罩
      ctx.clearRect(x, y, width, height);
      
      // 绘制选择区域的边框
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // 在选择区域显示尺寸信息
      const sizeText = `${width} x ${height}`;
      const textX = x + width / 2;
      const textY = y + height / 2;
      
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 绘制文字背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const textWidth = ctx.measureText(sizeText).width;
      ctx.fillRect(textX - textWidth/2 - 5, textY - 10, textWidth + 10, 25);
      
      // 绘制文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sizeText, textX, textY);
    } catch (err) {
      console.error('绘制选择区域失败:', err);
    }
  };

  // 捕获选择的区域
  const captureSelectedArea = () => {
    // 计算选择区域
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    console.log('选择区域', x, y, width, height);

    // 如果选择区域太小，则认为是点击事件，取消截图
    if (width < 10 || height < 10) {
      console.log('选择区域太小，取消截图');
      window.close();
      return;
    }

    // 判断是否为直接截图模式
    if (originalImageRef.current) {
      // 原始模式：从已加载的图像中剪切区域
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // 创建一个新的Canvas来保存选择的区域
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = width;
      captureCanvas.height = height;
      const captureCtx = captureCanvas.getContext('2d');

      if (captureCtx) {
        // 计算原始图像和显示图像的比例
        const scaleX = originalImageRef.current.naturalWidth / canvas.width;
        const scaleY = originalImageRef.current.naturalHeight / canvas.height;
        
        // 从原始图像中剪切选择的区域（考虑缩放比例）
        const sourceX = x * scaleX;
        const sourceY = y * scaleY;
        const sourceWidth = width * scaleX;
        const sourceHeight = height * scaleY;
        
        console.log('剪切原始图像', sourceX, sourceY, sourceWidth, sourceHeight);
        
        // 绘制到新Canvas
        captureCtx.drawImage(
          originalImageRef.current,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, width, height
        );

        // 获取图像数据URL
        const dataUrl = captureCanvas.toDataURL('image/png');
        console.log('生成数据URL', dataUrl.substring(0, 50) + '...');

        // 保存截图
        window.electronAPI.saveScreenCapture(dataUrl)
          .then((filePath) => {
            console.log('截图已保存', filePath);
            window.close();
          })
          .catch((error) => {
            console.error('保存截图失败:', error);
            window.close();
          });
      }
    } else {
      // 直接截图模式：直接捕获屏幕区域
      console.log('使用直接截图模式捕获区域');
      window.electronAPI.captureScreenArea({ x, y, width, height })
        .then((filePath) => {
          console.log('截图已保存', filePath);
          window.close();
        })
        .catch((error) => {
          console.error('捕获屏幕区域失败:', error);
          window.close();
        });
    }
  };

  // 处理按键事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('按下ESC键，取消截图');
        window.close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="capture-screen">
      {screenData && (
        <img
          ref={imageRef}
          src={screenData?.thumbnail || ''}
          alt="Screen"
          style={{ display: 'none' }}
        />
      )}
      <canvas
        ref={canvasRef}
        className="capture-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div className="capture-info">
        {isDrawing && (
          <div className="capture-size-info">
            {Math.abs(endPoint.x - startPoint.x)} x {Math.abs(endPoint.y - startPoint.y)}
          </div>
        )}
      </div>
      <div className="capture-instructions">
        拖动鼠标选择要截取的区域
      </div>
    </div>
  );
};

export default CaptureScreen;
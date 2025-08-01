import { useMainAppState } from "../hooks/useMainAppState";
import { useMainAppLogic } from "../hooks/useMainAppLogic";
import { useMainAppEffects } from "../hooks/useMainAppEffects";
import { CaptureButton } from "./CaptureButton";
import { InfoSection } from "./InfoSection";
import { SelectedImageDisplay } from "./SelectedImageDisplay";
import "../assets/styles/index.css";

export const MainApp = () => {
  const {
    isCapturing,
    setIsCapturing,
    selectedImage,
    setSelectedImage,
    selectedImageInfo,
    setSelectedImageInfo,
    clearSelectedImage,
  } = useMainAppState();

  const { handleCaptureScreen } = useMainAppLogic();

  useMainAppEffects(setSelectedImage, setSelectedImageInfo);

  const onCapture = () => {
    handleCaptureScreen(setIsCapturing);
  };

  return (
    <div className="app-container">
      {/* 左侧菜单 */}
      <div className="sidebar">
        <div className="logo">
          <div className="logo-icon">📷</div>
          <div className="logo-text">Fast OCR</div>
        </div>
        
        <nav className="menu">
          <div className="menu-item active">
            <div className="menu-icon">🏠</div>
            <div className="menu-text">首页</div>
          </div>
          <div className="menu-item">
            <div className="menu-icon">⚙️</div>
            <div className="menu-text">设置</div>
          </div>
        </nav>
      </div>

      {/* 主内容区域 */}
      <div className="main-content">
        <div className="page active">
          <div className="page-header">
            <h1>首页</h1>
            <p>快速截图并识别文字内容</p>
          </div>
          
          <div className="content-area">
            {/* 截图区域 */}
            <div className="screenshot-section">
              <CaptureButton isCapturing={isCapturing} onCapture={onCapture} />
            </div>
            
            {/* 信息提示区域 */}
            <InfoSection />
            
            {/* 图片显示区域 */}
            <div className="image-display-section">
              <div className="section-title">选择的图片</div>
              {selectedImage ? (
                <SelectedImageDisplay
                  selectedImage={selectedImage}
                  selectedImageInfo={selectedImageInfo}
                  onClear={clearSelectedImage}
                />
              ) : (
                <div className="image-placeholder">
                  <div className="placeholder-icon">🖼️</div>
                  <div className="placeholder-text">暂无选择的图片</div>
                  <div className="placeholder-hint">截图后将在此处显示</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
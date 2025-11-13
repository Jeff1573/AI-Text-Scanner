import "../assets/styles/screenshot-viewer.css";

export const LoadingState = () => {
  return (
    <div className="screenshot-viewer loading">
      <div className="loading-spinner"></div>
      <div className="loading-text">加载中...</div>
    </div>
  );
}; 
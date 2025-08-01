export const LoadingState = () => {
  return (
    <div className="screenshot-viewer loading">
      <div className="loading-spinner">加载中...</div>
      <div style={{ color: "#fff", marginTop: "1rem" }}>等待截图数据...</div>
      <div style={{ color: "#fff", marginTop: "0.5rem", fontSize: "0.9rem" }}>
        当前URL: {window.location.href}
      </div>
    </div>
  );
}; 
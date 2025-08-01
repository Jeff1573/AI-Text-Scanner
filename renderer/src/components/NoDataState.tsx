import "../assets/styles/screenshot-viewer.css";

export const NoDataState = () => {
  return (
    <div className="screenshot-viewer loading">
      <div className="loading-spinner">📷</div>
      <div style={{ color: "#fff", marginTop: "1rem" }}>等待截图数据...</div>
    </div>
  );
}; 
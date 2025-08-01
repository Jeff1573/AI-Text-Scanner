interface NoDataStateProps {
  onClose: () => void;
}

export const NoDataState = ({ onClose }: NoDataStateProps) => {
  return (
    <div className="screenshot-viewer loading">
      <div style={{ color: "#fff", fontSize: "1.2rem" }}>未收到截图数据</div>
      <div style={{ color: "#fff", marginTop: "0.5rem", fontSize: "0.9rem" }}>
        当前URL: {window.location.href}
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: "1rem",
          padding: "8px 16px",
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        关闭
      </button>
    </div>
  );
}; 
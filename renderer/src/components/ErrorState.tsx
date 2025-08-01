interface ErrorStateProps {
  error: string;
  onClose: () => void;
}

export const ErrorState = ({ error, onClose }: ErrorStateProps) => {
  return (
    <div className="screenshot-viewer loading">
      <div style={{ color: "#dc3545", fontSize: "1.2rem" }}>
        错误: {error}
      </div>
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
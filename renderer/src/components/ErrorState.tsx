import "../assets/styles/screenshot-viewer.css";

interface ErrorStateProps {
  error: string;
}

export const ErrorState = ({ error }: ErrorStateProps) => {
  return (
    <div className="screenshot-viewer loading">
      <div className="loading-spinner">❌</div>
      <div style={{ color: "#fff", marginTop: "1rem" }}>错误: {error}</div>
    </div>
  );
}; 
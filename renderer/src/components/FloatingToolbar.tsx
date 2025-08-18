import React from "react";
import "../assets/styles/floating-toolbar.css";

interface FloatingToolbarProps {
  onConfirm: () => void;
  onCancel: () => void;
  selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onConfirm,
  onCancel,
  selection,
}) => {
  const toolbarStyle: React.CSSProperties = {
    position: "absolute",
    left: `${selection.x + selection.width - 10}px`,
    top: `${selection.y + selection.height + 10}px`, // 10px offset
    zIndex: 1000,
  };

  return (
    <div className="floating-toolbar" style={toolbarStyle}>
      <button onClick={onCancel} className="toolbar-button cancel">
        <span className="toolbar-icon">❌</span>
        {/* <span className="toolbar-text">取消</span> */}
      </button>
      <button onClick={onConfirm} className="toolbar-button confirm">
        <span className="toolbar-icon">✅</span>
        {/* <span className="toolbar-text">确认</span> */}
      </button>
    </div>
  );
};
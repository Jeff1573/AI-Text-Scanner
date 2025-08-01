import React from 'react';
import '../assets/styles/titlebar.css';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI.windowClose();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-content">
        <div className="titlebar-left">
          <div className="app-title">
            <span className="app-icon">📷</span>
            <span className="app-name">AI-OCR</span>
          </div>
        </div>
        
        <div className="titlebar-right">
          <button 
            className="titlebar-button minimize-btn" 
            onClick={handleMinimize}
            title="最小化"
          >
            <svg className="button-icon" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          
          <button 
            className="titlebar-button maximize-btn" 
            onClick={handleMaximize}
            title="最大化/还原"
          >
            <svg className="button-icon" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2.5" y="2.5" width="5" height="5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            </svg>
          </button>
          
          <button 
            className="titlebar-button close-btn" 
            onClick={handleClose}
            title="关闭"
          >
            <svg className="button-icon" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}; 
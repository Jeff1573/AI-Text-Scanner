import React from 'react';
import { useTrayContext } from '../contexts/TrayContext';
import '../assets/styles/titlebar.css';

export const TitleBar: React.FC = () => {
  const { hideToTray, isTrayAvailable } = useTrayContext();

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMinimize();
    } else {
      console.warn('window.electronAPI 未定义，无法最小化窗口');
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMaximize();
    } else {
      console.warn('window.electronAPI 未定义，无法最大化窗口');
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      if (isTrayAvailable) {
        // 如果托盘可用，最小化到托盘
        await hideToTray();
      } else {
        // 如果托盘不可用，直接关闭窗口
        window.electronAPI.windowClose();
      }
    } else {
      console.warn('window.electronAPI 未定义，无法关闭窗口');
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-content">
        <div className="titlebar-left">
          <div className="app-title">
            <span className="app-icon">📷</span>
            <span className="app-name">AI Text Scanner</span>
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
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 暴露截图功能给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 开始截图
  startScreenCapture: () => ipcRenderer.invoke('start-screen-capture'),
  
  // 保存截图
  saveScreenCapture: (dataUrl: string) => ipcRenderer.invoke('save-screen-capture', dataUrl),
  
  // 监听截图完成事件
  onScreenCaptureComplete: (callback: (imagePath: string) => void) => {
    ipcRenderer.on('screen-capture-complete', (_event, imagePath) => {
      callback(imagePath);
    });
    
    // 返回清理函数，用于移除事件监听
    return () => {
      ipcRenderer.removeAllListeners('screen-capture-complete');
    };
  },
  
  // 监听截图数据
  onCaptureScreenData: (callback: (data: any) => void) => {
    ipcRenderer.on('capture-screen-data', (_event, data) => {
      callback(data);
    });
    
    return () => {
      ipcRenderer.removeAllListeners('capture-screen-data');
    };
  },
  
  // 监听直接截图模式启动
  onStartDirectCapture: (callback: (data: {width: number, height: number}) => void) => {
    ipcRenderer.on('start-direct-capture', (_event, data) => {
      callback(data);
    });
    
    return () => {
      ipcRenderer.removeAllListeners('start-direct-capture');
    };
  },
  
  // 捕获屏幕区域
  captureScreenArea: (bounds: {x: number, y: number, width: number, height: number}) => 
    ipcRenderer.invoke('capture-screen-area', bounds)
});

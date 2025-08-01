// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取屏幕截图
  captureScreen: (options: Record<string, unknown> = {}) => ipcRenderer.invoke('capture-screen', options),
  
  // 创建截图展示窗口
  createScreenshotWindow: (screenshotData: { id: string; name: string; thumbnail: string }) => ipcRenderer.invoke('create-screenshot-window', screenshotData),
  
  // 监听截图数据
  onScreenshotData: (callback: (data: { id: string; name: string; thumbnail: string }) => void) => {
    console.log('注册截图数据监听器');
    ipcRenderer.on('screenshot-data', (event, data) => {
      try {
        callback(data);
      } catch (error) {
        console.error('回调函数执行失败:', error);
      }
    });
  },
  
  // 移除截图数据监听器
  removeScreenshotDataListener: () => {
    ipcRenderer.removeAllListeners('screenshot-data');
  },
  
  // 保存配置
  saveConfig: (config: { apiUrl: string; apiKey: string; model: string; customModel: string }) => 
    ipcRenderer.invoke('save-config', config),
  
  // 加载配置
  loadConfig: () => ipcRenderer.invoke('load-config'),
});

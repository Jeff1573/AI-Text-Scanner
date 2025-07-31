// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 定义截图数据类型
interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取屏幕截图
  captureScreen: (options: Record<string, unknown> = {}) => ipcRenderer.invoke('capture-screen', options),
  
  // 创建截图展示窗口
  createScreenshotWindow: (screenshotData: ScreenSource) => ipcRenderer.invoke('create-screenshot-window', screenshotData),
  
  // 监听截图数据
  onScreenshotData: (callback: (data: ScreenSource) => void) => {
    console.log('注册截图数据监听器');
    ipcRenderer.on('screenshot-data', (event, data) => {
      console.log('预加载脚本收到截图数据:', data);
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
  }
});

// 声明全局类型
declare global {
  interface Window {
    electronAPI: {
      captureScreen: (options?: Record<string, unknown>) => Promise<{
        success: boolean;
        sources?: Array<{
          id: string;
          name: string;
          thumbnail: string;
        }>;
        error?: string;
      }>;
      createScreenshotWindow: (screenshotData: ScreenSource) => Promise<{
        success: boolean;
        error?: string;
      }>;
      onScreenshotData: (callback: (data: ScreenSource) => void) => void;
      removeScreenshotDataListener: () => void;
    };
  }
}

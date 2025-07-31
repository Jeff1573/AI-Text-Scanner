// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取屏幕截图
  captureScreen: (options: Record<string, unknown> = {}) => ipcRenderer.invoke('capture-screen', options),
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
    };
  }
}

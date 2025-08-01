// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 类型定义
interface APIConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  customModel?: string;
}

interface ImageAnalysisRequest {
  imageData: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

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
  
  // 分析图片 - OpenAI
  analyzeImageOpenAI: (config: APIConfig, request: ImageAnalysisRequest) => 
    ipcRenderer.invoke('analyze-image-openai', config, request),
  
  // 验证OpenAI API配置
  validateOpenAIConfig: (config: APIConfig) => 
    ipcRenderer.invoke('validate-openai-config', config),
  
  // 获取可用的OpenAI模型列表
  getOpenAIModels: (config: APIConfig) => 
    ipcRenderer.invoke('get-openai-models', config),
  
  // 窗口控制功能
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
});

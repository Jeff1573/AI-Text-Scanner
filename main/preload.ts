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

interface SettingsConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  // 新增：全局快捷键配置
  resultHotkey: string;
  screenshotHotkey: string;
}

interface ImageAnalysisRequest {
  imageData: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
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

  // 通知主进程：截图图像已准备好首帧
  notifyScreenshotReady: () => {
    ipcRenderer.send('screenshot-image-ready');
  },
  
  // 移除截图数据监听器
  removeScreenshotDataListener: () => {
    ipcRenderer.removeAllListeners('screenshot-data');
  },
  
  // 保存配置
  saveConfig: (config: SettingsConfig) => 
    ipcRenderer.invoke('save-config', config),
  
  // 加载配置
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // 获取最新配置（带默认值）
  getLatestConfigWithDefaults: (withDefaults = false) => ipcRenderer.invoke('get-latest-config', withDefaults),
  
  // 分析图片 - OpenAI
  analyzeImageOpenAI: (request: ImageAnalysisRequest) => 
    ipcRenderer.invoke('analyze-image-openai', request),
  
  // 验证OpenAI API配置
  validateOpenAIConfig: () => 
    ipcRenderer.invoke('validate-openai-config'),
  
  // 获取可用的OpenAI模型列表
  getOpenAIModels: () =>
    ipcRenderer.invoke('get-openai-models'),

  // 翻译文本
  translate: (request: TranslateRequest) =>
    ipcRenderer.invoke('translate-text', request),
  
  // 窗口控制功能
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // 新增：打开结果窗口
  openResultWindow: (resultContent: string) => ipcRenderer.invoke('open-result-window', resultContent),
  // 新增：监听结果窗口数据
  onResultData: (callback: (data: string) => void) => {
    ipcRenderer.on('result-data', (event, data) => callback(data));
  },
  // 新增：移除结果窗口数据监听
  removeResultDataListener: () => {
    ipcRenderer.removeAllListeners('result-data');
  },
  // 新增：获取剪贴板内容
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  
  // 新增：监听打开ResultPage事件
  onOpenResultPage: (callback: () => void) => {
    ipcRenderer.on('open-result-page', () => {
      try {
        callback();
      } catch (error) {
        console.error('打开ResultPage回调函数执行失败:', error);
      }
    });
  },
  
  // 新增：移除打开ResultPage事件监听
  removeOpenResultPageListener: () => {
    ipcRenderer.removeAllListeners('open-result-page');
  },
  
  // 新增：监听打开ScreenshotViewer事件
  onOpenScreenshotViewer: (callback: (data: { id: string; name: string; thumbnail: string }) => void) => {
    ipcRenderer.on('open-screenshot-viewer', (event, data) => {
      try {
        callback(data);
      } catch (error) {
        console.error('打开ScreenshotViewer回调函数执行失败:', error);
      }
    });
  },
  
  // 新增：移除打开ScreenshotViewer事件监听
  removeOpenScreenshotViewerListener: () => {
    ipcRenderer.removeAllListeners('open-screenshot-viewer');
  },
  
  // 托盘相关API
  hideToTray: () => ipcRenderer.invoke('hide-to-tray'),
  showFromTray: () => ipcRenderer.invoke('show-from-tray'),
  isTrayAvailable: () => ipcRenderer.invoke('is-tray-available'),
  
  // 监听打开设置页面事件
  onOpenSettingsPage: (callback: () => void) => {
    ipcRenderer.on('open-settings-page', () => {
      try {
        callback();
      } catch (error) {
        console.error('打开设置页面回调函数执行失败:', error);
      }
    });
  },
  
  // 移除打开设置页面事件监听
  removeOpenSettingsPageListener: () => {
    ipcRenderer.removeAllListeners('open-settings-page');
  },
});

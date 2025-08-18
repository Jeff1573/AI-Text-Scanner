// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// 简化的日志函数，避免复杂的依赖
const logger = {
  debug: (message: string, meta?: any) => console.debug(`[Preload] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[Preload] ${message}`, meta),
  info: (message: string, meta?: any) => console.info(`[Preload] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[Preload] ${message}`, meta),
};

// 类型定义

interface SettingsConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  // 新增：全局快捷键配置
  resultHotkey: string;
  screenshotHotkey: string;
  // 新增：开机自启配置
  autoLaunch: boolean;
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
    logger.debug('注册截图数据监听器');
    ipcRenderer.on('screenshot-data', (event, data) => {
      try {
        callback(data);
      } catch (error) {
        logger.error('回调函数执行失败', { error });
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
  
  // 获取最新配置
  getLatestConfig: (withDefaults = false) => ipcRenderer.invoke('get-latest-config', withDefaults),
  
  // 获取配置（兼容性API）
  getConfig: () => ipcRenderer.invoke('load-config'),
  
  // 分析图片
  analyzeImage: (request: ImageAnalysisRequest) =>
    ipcRenderer.invoke('analyze-image', request),
  
  // 验证API配置
  validateApiConfig: () =>
    ipcRenderer.invoke('validate-api-config'),
  
  // 获取可用的模型列表
  getModels: () =>
    ipcRenderer.invoke('get-models'),

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
        logger.error('打开ResultPage回调函数执行失败', { error });
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
        logger.error('打开ScreenshotViewer回调函数执行失败', { error });
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
        logger.error('打开设置页面回调函数执行失败', { error });
      }
    });
  },

  // 移除打开设置页面事件监听
  removeOpenSettingsPageListener: () => {
    ipcRenderer.removeAllListeners('open-settings-page');
  },

  // 开机自启动 API
  getLoginItemSettings: () => ipcRenderer.invoke('get-login-item-settings'),
  setLoginItemSettings: (enable: boolean) => ipcRenderer.invoke('set-login-item-settings', enable),
  validateAutoLaunch: () => ipcRenderer.invoke('validate-auto-launch'),
  getAutoLaunchDiagnostics: () => ipcRenderer.invoke('get-auto-launch-diagnostics'),

  // HTML查看器窗口 API
  openHtmlViewer: (htmlContent: string, title?: string) => ipcRenderer.invoke('open-html-viewer', htmlContent, title),

  // 获取应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
});

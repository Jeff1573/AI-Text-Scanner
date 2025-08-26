import { autoUpdater } from "electron-updater";
import { app, dialog, BrowserWindow } from "electron";
import { createModuleLogger } from "../utils/logger";

// 下载进度接口
interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

const logger = createModuleLogger('UpdateManager');

/**
 * 更新管理器
 * 负责处理应用的手动更新检测和自动更新
 */
export class UpdateManager {
  private isChecking = false;
  private updateAvailable = false;
  private updateInfo: any = null;
  private downloadProgress: DownloadProgress | null = null;
  private isDownloading = false;
  private isManualCheck = false; // 标记是否为手动检查

  constructor() {
    this.initializeUpdater();
  }

  /**
   * 初始化自动更新器
   */
  private initializeUpdater(): void {
    // 配置自动更新器
    autoUpdater.autoDownload = false; // 不自动下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true; // 应用退出时自动安装

    // 监听更新检查开始
    autoUpdater.on('checking-for-update', () => {
      logger.info('开始检查更新');
      this.isChecking = true;
    });

    // 监听更新可用
    autoUpdater.on('update-available', (info) => {
      logger.info('发现可用更新', { info });
      this.updateAvailable = true;
      this.updateInfo = info;
      this.isChecking = false;
      this.showUpdateAvailableDialog(info);
      this.isManualCheck = false; // 重置标记
    });

    // 监听更新不可用
    autoUpdater.on('update-not-available', (info) => {
      logger.info('当前已是最新版本', { info });
      this.updateAvailable = false;
      this.updateInfo = null;
      this.isChecking = false;
      // 只有手动检查时才显示"已是最新版本"对话框
      if (this.isManualCheck) {
        this.showNoUpdateDialog();
      }
      this.isManualCheck = false; // 重置标记
    });

    // 监听更新错误
    autoUpdater.on('error', (err) => {
      logger.error('更新检查失败', { error: err });
      this.isChecking = false;
      // 只有手动检查时才显示错误对话框
      if (this.isManualCheck) {
        this.showUpdateErrorDialog(err);
      }
      this.isManualCheck = false; // 重置标记
    });

    // 监听下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      logger.info('下载进度', { progressObj });
      this.downloadProgress = progressObj;
      this.isDownloading = true;
      
      // 发送进度更新到渲染进程
      this.sendProgressToRenderer(progressObj);
    });

    // 监听下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('更新下载完成', { info });
      this.isDownloading = false;
      this.downloadProgress = null;
      this.showUpdateReadyDialog(info);
    });
  }

  /**
   * 启动时自动检查更新（静默检查，只在有更新时提示）
   */
  public async checkForUpdatesOnStartup(): Promise<void> {
    try {
      if (this.isChecking) {
        return;
      }

      logger.info('应用启动时检查更新');
      this.isManualCheck = false; // 标记为自动检查
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error('启动时检查更新失败', { error });
      // 静默失败，不显示错误对话框
    }
  }

  /**
   * 手动检查更新
   */
  public async checkForUpdates(): Promise<{
    success: boolean;
    checking: boolean;
    updateAvailable?: boolean;
    updateInfo?: any;
    error?: string;
  }> {
    try {
      if (this.isChecking) {
        return {
          success: true,
          checking: true,
        };
      }

      logger.info('开始手动检查更新');
      this.isManualCheck = true; // 标记为手动检查
      await autoUpdater.checkForUpdates();
      
      return {
        success: true,
        checking: true,
      };
    } catch (error) {
      logger.error('检查更新失败', { error });
      this.isManualCheck = false; // 重置标记
      return {
        success: false,
        checking: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 下载更新
   */
  public async downloadUpdate(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.updateAvailable) {
        return {
          success: false,
          error: '没有可用的更新',
        };
      }

      logger.info('开始下载更新');
      // 重置下载状态
      this.downloadProgress = null;
      this.isDownloading = true;
      
      await autoUpdater.downloadUpdate();
      
      return {
        success: true,
      };
    } catch (error) {
      logger.error('下载更新失败', { error });
      this.isDownloading = false;
      this.downloadProgress = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 安装更新
   */
  public async installUpdate(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('开始安装更新');
      autoUpdater.quitAndInstall();
      
      return {
        success: true,
      };
    } catch (error) {
      logger.error('安装更新失败', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus(): {
    isChecking: boolean;
    updateAvailable: boolean;
    updateInfo: any;
    currentVersion: string;
    isDownloading: boolean;
    downloadProgress: DownloadProgress | null;
  } {
    return {
      isChecking: this.isChecking,
      updateAvailable: this.updateAvailable,
      updateInfo: this.updateInfo,
      currentVersion: app.getVersion(),
      isDownloading: this.isDownloading,
      downloadProgress: this.downloadProgress,
    };
  }

  /**
   * 获取下载进度
   */
  public getDownloadProgress(): DownloadProgress | null {
    return this.downloadProgress;
  }

  /**
   * 发送进度更新到渲染进程
   */
  private sendProgressToRenderer(progress: DownloadProgress): void {
    try {
      // 获取所有BrowserWindow实例并发送进度更新
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('download-progress-update', progress);
        }
      });
    } catch (error) {
      logger.error('发送下载进度失败', { error });
    }
  }

  /**
   * 显示更新可用对话框
   */
  private async showUpdateAvailableDialog(info: any): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}`,
      detail: `当前版本: ${app.getVersion()}\n新版本: ${info.version}\n\n是否现在下载并安装？`,
      buttons: ['立即更新', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      // 用户选择立即更新
      this.downloadUpdate();
    }
  }

  /**
   * 显示无更新对话框
   */
  private async showNoUpdateDialog(): Promise<void> {
    await dialog.showMessageBox({
      type: 'info',
      title: '检查更新',
      message: '当前已是最新版本',
      detail: `当前版本: ${app.getVersion()}`,
      buttons: ['确定'],
    });
  }

  /**
   * 显示更新错误对话框
   */
  private async showUpdateErrorDialog(error: Error): Promise<void> {
    await dialog.showMessageBox({
      type: 'error',
      title: '更新检查失败',
      message: '无法检查更新',
      detail: `错误信息: ${error.message}`,
      buttons: ['确定'],
    });
  }

  /**
   * 显示更新就绪对话框
   */
  private async showUpdateReadyDialog(info: any): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '更新就绪',
      message: '更新已下载完成',
      detail: `新版本 ${info.version} 已准备就绪，是否立即安装？\n\n安装后应用将自动重启。`,
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      // 用户选择立即安装
      this.installUpdate();
    }
  }
}

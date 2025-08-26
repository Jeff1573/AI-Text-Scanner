import { autoUpdater } from "electron-updater";
import { app, dialog, BrowserWindow } from "electron";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('UpdateManager');

/**
 * 更新管理器
 * 负责处理应用的手动更新检测和自动更新
 */
export class UpdateManager {
  private isChecking = false;
  private updateAvailable = false;
  private updateInfo: any = null;

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
    });

    // 监听更新不可用
    autoUpdater.on('update-not-available', (info) => {
      logger.info('当前已是最新版本', { info });
      this.updateAvailable = false;
      this.updateInfo = null;
      this.isChecking = false;
      this.showNoUpdateDialog();
    });

    // 监听更新错误
    autoUpdater.on('error', (err) => {
      logger.error('更新检查失败', { error: err });
      this.isChecking = false;
      this.showUpdateErrorDialog(err);
    });

    // 监听下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      logger.info('下载进度', { progressObj });
    });

    // 监听下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('更新下载完成', { info });
      this.showUpdateReadyDialog(info);
    });
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
      await autoUpdater.checkForUpdates();
      
      return {
        success: true,
        checking: true,
      };
    } catch (error) {
      logger.error('检查更新失败', { error });
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
      await autoUpdater.downloadUpdate();
      
      return {
        success: true,
      };
    } catch (error) {
      logger.error('下载更新失败', { error });
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
  } {
    return {
      isChecking: this.isChecking,
      updateAvailable: this.updateAvailable,
      updateInfo: this.updateInfo,
      currentVersion: app.getVersion(),
    };
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

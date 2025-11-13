import { ipcMain, clipboard, app, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ConfigManager } from "./configManager";
import type { UpdateManager } from "./updateManager";
import {
  AIServiceFactory,
  type APIConfig,
  type ImageAnalysisRequest,
  type TranslateRequest,
} from "../utils/aiService";
import { validateAutoLaunchStatus, getAutoLaunchDiagnostics } from "../utils/autoLaunchValidator";
import { createModuleLogger } from "../utils/logger";
import { BrowserWindow } from "electron";

const logger = createModuleLogger('IPCHandlers');

export class IPCHandlers {
  constructor(
    private configManager: ConfigManager,
    private updateManager?: UpdateManager
  ) {}

  registerAllHandlers(): void {
    this.registerClipboardHandlers();
    this.registerAPIHandlers();
    this.registerSystemHandlers();
    this.registerVersionHandler();
    this.registerImageAnalysisHandler();
    this.registerUpdateHandlers();
  }

  private registerClipboardHandlers(): void {
    ipcMain.handle("get-clipboard-text", async () => {
      try {
        const text = clipboard.readText();
        return { success: true, text };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "未知错误", 
          text: "" 
        };
      }
    });
  }

  private registerAPIHandlers(): void {
    ipcMain.handle(
      "translate-text",
      async (_event, request: TranslateRequest) => {
        try {
          logger.info("收到文本翻译请求", { request });
          
          const config = this.configManager.getLatestConfigWithDefaults();
          const apiConfig: APIConfig = {
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            model: config.model,
            customModel: config.customModel,
            provider: config.provider as any,
          };
          
          const aiService = AIServiceFactory.create(apiConfig);
          const result = await aiService.translateText(request);
          logger.info("文本翻译结果", { result });
          return result;
        } catch (error) {
          logger.error("文本翻译请求处理失败", { error });
          return {
            content: "",
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );

    ipcMain.handle(
      "analyze-image",
      async (_event, request: ImageAnalysisRequest) => {
        try {
          // logger.info("收到图片分析请求", { request });
          const config = this.configManager.getLatestConfigWithDefaults();
          const apiConfig: APIConfig = {
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            model: config.model,
            customModel: config.customModel,
            provider: config.provider as any,
          };
          
          const aiService = AIServiceFactory.create(apiConfig);
          const result = await aiService.analyzeImage(request);

          logger.info("图片分析结果", {
            success: !result.error,
            contentLength: result.content?.length || 0,
            error: result.error,
          });

          return result;
        } catch (error) {
          logger.error("图片分析请求处理失败", { error });
          return {
            content: "",
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );

    ipcMain.handle("validate-api-config", async () => {
      try {
        const config = this.configManager.getLatestConfigWithDefaults();
        const apiConfig: APIConfig = {
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          customModel: config.customModel,
          provider: config.provider as any,
        };
        
        logger.info("验证API配置", {
          provider: apiConfig.provider,
          apiUrl: apiConfig.apiUrl,
          hasApiKey: !!apiConfig.apiKey,
          model: apiConfig.model,
        });

        const aiService = AIServiceFactory.create(apiConfig);
        const isValid = await aiService.validateConfig();

        logger.info("API配置验证结果", { isValid });

        return { success: isValid };
      } catch (error) {
        logger.error("API配置验证失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    ipcMain.handle("get-models", async () => {
      try {
        const config = this.configManager.getLatestConfigWithDefaults();
        const apiConfig: APIConfig = {
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          customModel: config.customModel,
          provider: config.provider as any,
        };
        
        logger.info("获取模型列表", {
          provider: apiConfig.provider,
          apiUrl: apiConfig.apiUrl,
          hasApiKey: !!apiConfig.apiKey,
        });

        const aiService = AIServiceFactory.create(apiConfig);
        const models = await aiService.getAvailableModels();

        logger.info("获取到的模型列表", { models });

        return {
          success: true,
          models: models,
        };
      } catch (error) {
        logger.error("获取模型列表失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          models: [],
        };
      }
    });
  }

  private registerVersionHandler(): void {
    ipcMain.handle("get-version", async () => {
      try {
        return { success: true, version: app.getVersion() };
      } catch (error) {
        logger.error("获取应用版本失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });
  }

  private registerImageAnalysisHandler(): void {
    ipcMain.handle("get-image-analysis", async () => {
      try {
        // TODO: 实现从实际的图片分析数据获取逻辑
        // 这里返回示例数据，实际使用时需要替换为真实的图片分析结果
        return { 
          success: true, 
          imageUrl: "", // 这里应该是实际的图片URL
          analysisText: "暂无解析结果，请先进行图片分析。" // 这里应该是实际的解析文本
        };
      } catch (error) {
        logger.error("获取图片分析数据失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });
  }

  private registerUpdateHandlers(): void {
    // 检查更新
    ipcMain.handle("check-for-updates", async () => {
      try {
        if (!this.updateManager) {
          return {
            success: false,
            error: "更新管理器未初始化",
          };
        }

        const result = await this.updateManager.checkForUpdates();
        logger.info("检查更新结果", { result });
        return result;
      } catch (error) {
        logger.error("检查更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 下载更新
    ipcMain.handle("download-update", async () => {
      try {
        if (!this.updateManager) {
          return {
            success: false,
            error: "更新管理器未初始化",
          };
        }

        const result = await this.updateManager.downloadUpdate();
        logger.info("下载更新结果", { result });
        return result;
      } catch (error) {
        logger.error("下载更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 安装更新
    ipcMain.handle("install-update", async () => {
      try {
        if (!this.updateManager) {
          return {
            success: false,
            error: "更新管理器未初始化",
          };
        }

        const result = await this.updateManager.installUpdate();
        logger.info("安装更新结果", { result });
        return result;
      } catch (error) {
        logger.error("安装更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 获取更新状态
    ipcMain.handle("get-update-status", async () => {
      try {
        if (!this.updateManager) {
          return {
            success: false,
            error: "更新管理器未初始化",
          };
        }

        const status = this.updateManager.getStatus();
        logger.info("获取更新状态", { status });
        return {
          success: true,
          status,
        };
      } catch (error) {
        logger.error("获取更新状态失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 获取下载进度
    ipcMain.handle("get-download-progress", async () => {
      try {
        if (!this.updateManager) {
          return {
            success: false,
            error: "更新管理器未初始化",
          };
        }

        const progress = this.updateManager.getDownloadProgress();
        logger.info("获取下载进度", { progress });
        return {
          success: true,
          progress,
        };
      } catch (error) {
        logger.error("获取下载进度失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });
  }

  private registerSystemHandlers(): void {
    // 获取系统信息
    ipcMain.handle("get-system-info", () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
      };
    });

    // 打开外部链接
    ipcMain.handle("open-external", async (event, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        logger.error("打开外部链接失败", { url, error });
        return { success: false, error: error.message };
      }
    });

    // 显示错误对话框
    ipcMain.handle("show-error-dialog", async (event, title: string, content: string) => {
      try {
        await dialog.showErrorBox(title, content);
        return { success: true };
      } catch (error) {
        logger.error("显示错误对话框失败", { title, content, error });
        return { success: false, error: error.message };
      }
    });

    // 显示信息对话框
    ipcMain.handle("show-info-dialog", async (event, title: string, content: string) => {
      try {
        const result = await dialog.showMessageBox({
          type: "info",
          title,
          message: content,
          buttons: ["确定"],
        });
        return { success: true, result };
      } catch (error) {
        logger.error("显示信息对话框失败", { title, content, error });
        return { success: false, error: error.message };
      }
    });

    // 显示确认对话框
    ipcMain.handle("show-confirm-dialog", async (event, title: string, content: string) => {
      try {
        const result = await dialog.showMessageBox({
          type: "question",
          title,
          message: content,
          buttons: ["确定", "取消"],
          defaultId: 0,
          cancelId: 1,
        });
        return { success: true, confirmed: result.response === 0 };
      } catch (error) {
        logger.error("显示确认对话框失败", { title, content, error });
        return { success: false, error: error.message };
      }
    });

    // 获取开机自启设置
    ipcMain.handle("get-login-item-settings", async () => {
      try {
        const settings = app.getLoginItemSettings();
        logger.debug("获取开机自启设置", { settings });
        return {
          success: true,
          settings: {
            openAtLogin: settings.openAtLogin,
            openAsHidden: settings.openAsHidden,
            wasOpenedAtLogin: settings.wasOpenedAtLogin,
            wasOpenedAsHidden: settings.wasOpenedAsHidden,
            restoreState: settings.restoreState,
          },
        };
      } catch (error) {
        logger.error("获取开机自启设置失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 设置开机自启
    ipcMain.handle("set-login-item-settings", async (event, enable: boolean) => {
      try {
        logger.info("设置开机自启", { enable });
        
        const settings = {
          openAtLogin: enable,
          openAsHidden: true, // 开机时隐藏启动
        };
        
        app.setLoginItemSettings(settings);
        
        // 验证设置是否生效
        const currentSettings = app.getLoginItemSettings();
        logger.info("开机自启设置已更新", { 
          requested: enable, 
          actual: currentSettings.openAtLogin 
        });
        
        return {
          success: true,
          verified: currentSettings.openAtLogin === enable,
          settings: {
            openAtLogin: currentSettings.openAtLogin,
            openAsHidden: currentSettings.openAsHidden,
            wasOpenedAtLogin: currentSettings.wasOpenedAtLogin,
            wasOpenedAsHidden: currentSettings.wasOpenedAsHidden,
            restoreState: currentSettings.restoreState,
          },
        };
      } catch (error) {
        logger.error("设置开机自启失败", { enable, error });
        return {
          success: false,
          verified: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 验证开机自启状态
    ipcMain.handle("validate-auto-launch", async () => {
      try {
        const result = await validateAutoLaunchStatus();
        logger.info("开机自启验证完成", { result });
        return {
          success: true,
          result,
        };
      } catch (error) {
        logger.error("验证开机自启失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 获取开机自启诊断信息
    ipcMain.handle("get-auto-launch-diagnostics", async () => {
      try {
        const diagnostics = await getAutoLaunchDiagnostics();
        logger.info("获取开机自启诊断信息", { diagnostics });
        return {
          success: true,
          diagnostics,
        };
      } catch (error) {
        logger.error("获取开机自启诊断信息失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });


  }


}
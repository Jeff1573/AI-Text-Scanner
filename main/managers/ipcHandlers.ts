import { ipcMain, clipboard, app } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ConfigManager } from "./configManager";
import {
  AIServiceFactory,
  type APIConfig,
  type ImageAnalysisRequest,
  type TranslateRequest,
} from "../utils/aiService";
import { validateAutoLaunchStatus, getAutoLaunchDiagnostics } from "../utils/autoLaunchValidator";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('IPCHandlers');

export class IPCHandlers {
  constructor(private configManager: ConfigManager) {}

  registerAllHandlers(): void {
    this.registerClipboardHandlers();
    this.registerAPIHandlers();
    this.registerSystemHandlers();
    this.registerVersionHandler();
    this.registerImageAnalysisHandler();
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

  private registerSystemHandlers(): void {
    ipcMain.handle('get-login-item-settings', async () => {
      try {
        logger.info("获取开机自启状态", { execPath: process.execPath });

        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const exeName = path.basename(process.execPath);
          logger.info("应用路径信息", { appFolder, exeName });

          // 改进的路径检测策略，优先使用 Squirrel 方式
          const pathStrategies = [
            // 策略1: Squirrel Update.exe 方式 (推荐用于打包应用)
            {
              name: 'Squirrel Update.exe',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', exeName]
            },
            // 策略2: Squirrel 标准启动器
            {
              name: 'Squirrel Standard',
              path: path.resolve(appFolder, '..', exeName),
              args: undefined
            },
            // 策略3: 直接使用当前可执行文件 (开发环境)
            {
              name: 'Direct Executable',
              path: process.execPath,
              args: undefined
            }
          ];

          let detectedSettings = null;
          let activeStrategy = null;

          // 检测所有策略的状态
          for (const strategy of pathStrategies) {
            logger.debug("检查策略", { name: strategy.name, path: strategy.path });
            if (fs.existsSync(strategy.path)) {
              const options: { path: string; args?: string[] } = { path: strategy.path };
              if (strategy.args) {
                options.args = strategy.args;
              }
              
              const settings = app.getLoginItemSettings(options);
              logger.debug("策略状态", { name: strategy.name, settings });
              
              if (settings.openAtLogin && !detectedSettings) {
                detectedSettings = settings;
                activeStrategy = strategy;
                logger.info("找到活跃策略", { name: strategy.name });
                break; // 找到第一个活跃的策略就停止
              }
            } else {
              logger.debug("策略路径不存在", { name: strategy.name });
            }
          }

          // 如果没有检测到活跃的设置，使用第一个可用策略检查
          if (!detectedSettings) {
            logger.info("未找到活跃策略，使用第一个可用策略");
            const firstAvailable = pathStrategies.find(s => fs.existsSync(s.path));
            if (firstAvailable) {
              const options: { path: string; args?: string[] } = { path: firstAvailable.path };
              if (firstAvailable.args) {
                options.args = firstAvailable.args;
              }
              detectedSettings = app.getLoginItemSettings(options);
              activeStrategy = firstAvailable;
              logger.info("使用策略", { name: firstAvailable.name });
            }
          }

          const result = { 
            success: true, 
            openAtLogin: detectedSettings?.openAtLogin || false,
            strategy: activeStrategy?.name || 'None',
            path: activeStrategy?.path || '',
            raw: detectedSettings 
          };
          
          logger.info("最终结果", result);
          return result;
        } else {
          // 非 Windows 平台
          const settings = app.getLoginItemSettings();
          return { success: true, openAtLogin: settings.openAtLogin, raw: settings };
        }
      } catch (error: unknown) {
        logger.error("获取状态失败", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('set-login-item-settings', async (_event, enable: boolean) => {
      try {
        logger.info("设置开机自启", { enable, execPath: process.execPath, platform: process.platform });

        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const exeName = path.basename(process.execPath);
          logger.info("应用路径信息", { appFolder, exeName });

          // 改进的路径检测策略，优先使用 Squirrel Update.exe 方式
          const pathStrategies = [
            // 策略1: Squirrel Update.exe 方式 (推荐用于打包应用)
            {
              name: 'Squirrel Update.exe',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', exeName]
            },
            // 策略2: Squirrel 标准启动器
            {
              name: 'Squirrel Standard',
              path: path.resolve(appFolder, '..', exeName),
              args: undefined
            },
            // 策略3: 直接使用当前可执行文件 (开发环境)
            {
              name: 'Direct Executable',
              path: process.execPath,
              args: undefined
            }
          ];

          let selectedStrategy = null;
          
          // 按优先级检测可用策略
          for (const strategy of pathStrategies) {
            logger.debug("检测策略", { name: strategy.name, path: strategy.path });
            if (fs.existsSync(strategy.path)) {
              selectedStrategy = strategy;
              logger.info("选择策略", { name: strategy.name });
              break;
            }
          }

          if (!selectedStrategy) {
            throw new Error('无法找到有效的应用启动路径');
          }

          // 如果要禁用开机自启，先清除所有可能的设置
          if (!enable) {
            logger.info("禁用开机自启，清除所有策略的设置");
            for (const strategy of pathStrategies) {
              if (fs.existsSync(strategy.path)) {
                const clearOptions: { openAtLogin: boolean; path: string; args?: string[] } = {
                  openAtLogin: false,
                  path: strategy.path
                };
                if (strategy.args) {
                  clearOptions.args = strategy.args;
                }
                app.setLoginItemSettings(clearOptions);
                logger.debug("清除策略", { name: strategy.name });
              }
            }
          }

          // 设置开机自启
          const loginSettings: { openAtLogin: boolean; path: string; args?: string[] } = {
            openAtLogin: enable,
            path: selectedStrategy.path
          };
          
          if (selectedStrategy.args) {
            loginSettings.args = selectedStrategy.args;
          }

          logger.debug("设置参数", loginSettings);
          app.setLoginItemSettings(loginSettings);

          // 验证设置结果
          const confirmOptions: { path: string; args?: string[] } = {
            path: selectedStrategy.path
          };
          if (selectedStrategy.args) {
            confirmOptions.args = selectedStrategy.args;
          }

          const confirmed = app.getLoginItemSettings(confirmOptions);
          logger.debug("验证结果", confirmed);

          // 额外验证：检查是否真的设置成功
          const isActuallySet = confirmed.openAtLogin === enable;
          if (!isActuallySet) {
            logger.warn("设置验证失败", { expected: enable, actual: confirmed.openAtLogin });
          }

          return { 
            success: isActuallySet, 
            openAtLogin: confirmed.openAtLogin,
            strategy: selectedStrategy.name,
            path: selectedStrategy.path,
            verified: isActuallySet
          };
        } else {
          // 非 Windows 平台
          app.setLoginItemSettings({ openAtLogin: enable });
          const confirmed = app.getLoginItemSettings();
          const isActuallySet = confirmed.openAtLogin === enable;
          return { 
            success: isActuallySet, 
            openAtLogin: confirmed.openAtLogin,
            verified: isActuallySet
          };
        }
      } catch (error: unknown) {
        logger.error("设置失败", { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // 开机自启验证工具
    ipcMain.handle('validate-auto-launch', async () => {
      try {
        const result = await validateAutoLaunchStatus();
        return { success: true, ...result };
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // 开机自启诊断报告
    ipcMain.handle('get-auto-launch-diagnostics', async () => {
      try {
        const report = await getAutoLaunchDiagnostics();
        return { success: true, report };
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }
}
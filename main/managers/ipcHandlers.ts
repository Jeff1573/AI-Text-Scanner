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

  private registerSystemHandlers(): void {
    ipcMain.handle('get-login-item-settings', async () => {
      try {
        logger.info("获取开机自启状态", { execPath: process.execPath });

        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const exeName = path.basename(process.execPath);
          logger.info("应用路径信息", { appFolder, exeName });

          // 改进的路径检测策略，优先使用 Direct Executable（直接 EXE）
          const pathStrategies = [
            // 策略1: 直接使用当前可执行文件（对多数环境最稳妥）
            {
              name: 'Direct Executable',
              path: process.execPath,
              args: undefined
            },
            // 策略2: Squirrel 标准启动器（部分发行包格式）
            {
              name: 'Squirrel Standard',
              path: path.resolve(appFolder, '..', exeName),
              args: undefined
            },
            // 策略3: Squirrel Update.exe 方式（固定应用名称）
            {
              name: 'Squirrel Update.exe (FixedName)',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', 'AI Text Scanner.exe']
            },
            // 策略4: Squirrel Update.exe 方式（动态名称）
            {
              name: 'Squirrel Update.exe (DynamicName)',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', exeName]
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

          // 改进的路径检测策略，优先使用 Direct Executable（直接 EXE）
          const pathStrategies = [
            // 策略1: 直接使用当前可执行文件（最稳妥）
            {
              name: 'Direct Executable',
              path: process.execPath,
              args: undefined
            },
            // 策略2: Squirrel 标准启动器
            {
              name: 'Squirrel Standard',
              path: path.resolve(appFolder, '..', exeName),
              args: undefined
            },
            // 策略3: Squirrel Update.exe（固定名）
            {
              name: 'Squirrel Update.exe (FixedName)',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', 'AI Text Scanner.exe']
            },
            // 策略4: Squirrel Update.exe（动态名）
            {
              name: 'Squirrel Update.exe (DynamicName)',
              path: path.resolve(appFolder, '..', 'Update.exe'),
              args: ['--processStart', exeName]
            }
          ];

          // 逐策略尝试设置 + 验证，直到成功或全部失败
          const tried: Array<{ name: string; path: string; ok: boolean }> = [];

          // 如果要禁用开机自启，先清除所有可能的设置
          if (!enable) {
            logger.info("禁用开机自启，清除所有策略的设置");
            for (const strategy of pathStrategies) {
              if (fs.existsSync(strategy.path)) {
                const clearOptions: { openAtLogin: boolean; path: string; args?: string[] } = {
                  openAtLogin: false,
                  path: strategy.path
                };
                if (strategy.args) clearOptions.args = strategy.args;
                app.setLoginItemSettings(clearOptions);
                tried.push({ name: strategy.name, path: strategy.path, ok: true });
              }
            }
            return { success: true, openAtLogin: false, strategy: 'AllCleared', path: '' , verified: true };
          }

          for (const strategy of pathStrategies) {
            if (!fs.existsSync(strategy.path)) {
              tried.push({ name: strategy.name, path: strategy.path, ok: false });
              continue;
            }

            const loginSettings: { openAtLogin: boolean; path: string; args?: string[] } = {
              openAtLogin: true,
              path: strategy.path
            };
            if (strategy.args) loginSettings.args = strategy.args;

            logger.debug("尝试设置", { strategy: strategy.name, loginSettings });
            app.setLoginItemSettings(loginSettings);

            const confirmOptions: { path: string; args?: string[] } = { path: strategy.path };
            if (strategy.args) confirmOptions.args = strategy.args;

            const confirmed = app.getLoginItemSettings(confirmOptions);
            const ok = confirmed.openAtLogin === true;
            tried.push({ name: strategy.name, path: strategy.path, ok });
            logger.debug("验证结果", { strategy: strategy.name, ok, confirmed });

            if (ok) {
              return {
                success: true,
                openAtLogin: true,
                strategy: strategy.name,
                path: strategy.path,
                verified: true
              };
            }
          }

          logger.warn("所有策略均尝试失败", { tried });
          return { success: false, error: '无法设置开机自启（所有策略失败）' };
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

  private registerUpdateHandlers(): void {
    // 检查更新
    ipcMain.handle("check-for-updates", async () => {
      try {
        logger.info("收到检查更新请求");
        
        // 由于 update-electron-app 是自动处理的，这里只是模拟返回
        // 在实际的自动更新中，update-electron-app 会自动处理更新检查
        // 这个处理器主要是为了UI的手动检查功能
        
        // 在开发环境中，我们返回模拟数据
        if (!app.isPackaged) {
          logger.info("开发环境，返回模拟更新检查结果");
          return {
            success: true,
            updateAvailable: false,
            message: "开发环境下无法检查更新"
          };
        }
        
        // 在打包环境中，update-electron-app 会自动处理
        // 这里我们只能返回基本信息
        return {
          success: true,
          updateAvailable: false,
          message: "自动更新检查正在后台进行"
        };
      } catch (error) {
        logger.error("检查更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误"
        };
      }
    });

    // 下载更新
    ipcMain.handle("download-update", async () => {
      try {
        logger.info("收到下载更新请求");
        
        if (!app.isPackaged) {
          return {
            success: false,
            error: "开发环境下无法下载更新"
          };
        }
        
        // update-electron-app 会自动处理下载
        return {
          success: true,
          message: "更新下载正在后台进行"
        };
      } catch (error) {
        logger.error("下载更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误"
        };
      }
    });

    // 安装更新
    ipcMain.handle("install-update", async () => {
      try {
        logger.info("收到安装更新请求");
        
        if (!app.isPackaged) {
          return {
            success: false,
            error: "开发环境下无法安装更新"
          };
        }
        
        // update-electron-app 会自动处理安装和重启
        // 通常在下载完成后会显示对话框让用户选择
        return {
          success: true,
          message: "更新安装正在进行，应用将重启"
        };
      } catch (error) {
        logger.error("安装更新失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误"
        };
      }
    });

    // 获取更新状态
    ipcMain.handle("get-update-status", async () => {
      try {
        logger.info("收到获取更新状态请求");
        
        return {
          success: true,
          status: {
            checking: false,
            available: false,
            downloading: false,
            downloaded: false,
            error: null
          }
        };
      } catch (error) {
        logger.error("获取更新状态失败", { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误"
        };
      }
    });
  }
}
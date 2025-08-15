import { ipcMain, clipboard, app } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ConfigManager } from "./configManager";
import {
  analyzeImageWithOpenAI,
  validateOpenAIConfig,
  getAvailableOpenAIModels,
  translateText,
  type APIConfig,
  type ImageAnalysisRequest,
  type TranslateRequest,
} from "../utils/openaiService";
import { validateAutoLaunchStatus, getAutoLaunchDiagnostics } from "../utils/autoLaunchValidator";

export class IPCHandlers {
  constructor(private configManager: ConfigManager) {}

  registerAllHandlers(): void {
    this.registerClipboardHandlers();
    this.registerAPIHandlers();
    this.registerSystemHandlers();
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
          console.log("收到文本翻译请求:", request);
          
          const config = this.configManager.getLatestConfigWithDefaults();
          const apiConfig: APIConfig = {
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            model: config.customModel || config.model
          };
          
          const result = await translateText(apiConfig, request);
          console.log("文本翻译结果:", result);
          return result;
        } catch (error) {
          console.error("文本翻译请求处理失败:", error);
          return {
            content: "",
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );

    ipcMain.handle(
      "analyze-image-openai",
      async (_event, request: ImageAnalysisRequest) => {
        try {
          const config = this.configManager.getLatestConfigWithDefaults();
          const apiConfig: APIConfig = {
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            model: config.customModel || config.model
          };
          
          const result = await analyzeImageWithOpenAI(apiConfig, request);

          console.log("analyze-image-openai:", {
            success: !result.error,
            contentLength: result.content?.length || 0,
            error: result.error,
          });

          return result;
        } catch (error) {
          console.error("图片分析请求处理失败:", error);
          return {
            content: "",
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }
    );

    ipcMain.handle("validate-openai-config", async () => {
      try {
        const config = this.configManager.getLatestConfigWithDefaults();
        const apiConfig: APIConfig = {
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.customModel || config.model
        };
        
        console.log("验证OpenAI API配置:", {
          apiUrl: apiConfig.apiUrl,
          hasApiKey: !!apiConfig.apiKey,
        });

        const isValid = await validateOpenAIConfig(apiConfig);

        console.log("OpenAI API配置验证结果:", isValid);

        return { success: isValid };
      } catch (error) {
        console.error("OpenAI API配置验证失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    ipcMain.handle("get-openai-models", async () => {
      try {
        const config = this.configManager.getLatestConfigWithDefaults();
        const apiConfig: APIConfig = {
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.customModel || config.model
        };
        
        console.log("获取OpenAI模型列表:", {
          apiUrl: apiConfig.apiUrl,
          hasApiKey: !!apiConfig.apiKey,
        });

        const models = await getAvailableOpenAIModels(apiConfig);

        console.log("获取到的模型列表:", models);

        return {
          success: true,
          models: models,
        };
      } catch (error) {
        console.error("获取OpenAI模型列表失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          models: [],
        };
      }
    });
  }

  private registerSystemHandlers(): void {
    ipcMain.handle('get-login-item-settings', async () => {
      try {
        console.log(`[AutoLaunch] 获取开机自启状态`);
        console.log(`[AutoLaunch] 当前执行路径: ${process.execPath}`);

        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const exeName = path.basename(process.execPath);
          console.log(`[AutoLaunch] 应用目录: ${appFolder}`);
          console.log(`[AutoLaunch] 可执行文件名: ${exeName}`);

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
            console.log(`[AutoLaunch] 检查策略: ${strategy.name}, 路径: ${strategy.path}`);
            if (fs.existsSync(strategy.path)) {
              const options: { path: string; args?: string[] } = { path: strategy.path };
              if (strategy.args) {
                options.args = strategy.args;
              }
              
              const settings = app.getLoginItemSettings(options);
              console.log(`[AutoLaunch] 策略 ${strategy.name} 状态:`, settings);
              
              if (settings.openAtLogin && !detectedSettings) {
                detectedSettings = settings;
                activeStrategy = strategy;
                console.log(`[AutoLaunch] 找到活跃策略: ${strategy.name}`);
                break; // 找到第一个活跃的策略就停止
              }
            } else {
              console.log(`[AutoLaunch] 策略 ${strategy.name} 路径不存在`);
            }
          }

          // 如果没有检测到活跃的设置，使用第一个可用策略检查
          if (!detectedSettings) {
            console.log(`[AutoLaunch] 未找到活跃策略，使用第一个可用策略`);
            const firstAvailable = pathStrategies.find(s => fs.existsSync(s.path));
            if (firstAvailable) {
              const options: { path: string; args?: string[] } = { path: firstAvailable.path };
              if (firstAvailable.args) {
                options.args = firstAvailable.args;
              }
              detectedSettings = app.getLoginItemSettings(options);
              activeStrategy = firstAvailable;
              console.log(`[AutoLaunch] 使用策略: ${firstAvailable.name}`);
            }
          }

          const result = { 
            success: true, 
            openAtLogin: detectedSettings?.openAtLogin || false,
            strategy: activeStrategy?.name || 'None',
            path: activeStrategy?.path || '',
            raw: detectedSettings 
          };
          
          console.log(`[AutoLaunch] 最终结果:`, result);
          return result;
        } else {
          // 非 Windows 平台
          const settings = app.getLoginItemSettings();
          return { success: true, openAtLogin: settings.openAtLogin, raw: settings };
        }
      } catch (error: unknown) {
        console.error(`[AutoLaunch] 获取状态失败:`, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('set-login-item-settings', async (_event, enable: boolean) => {
      try {
        console.log(`[AutoLaunch] 设置开机自启: ${enable}`);
        console.log(`[AutoLaunch] 当前执行路径: ${process.execPath}`);
        console.log(`[AutoLaunch] 平台: ${process.platform}`);

        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const exeName = path.basename(process.execPath);
          console.log(`[AutoLaunch] 应用目录: ${appFolder}`);
          console.log(`[AutoLaunch] 可执行文件名: ${exeName}`);

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
            console.log(`[AutoLaunch] 检测策略: ${strategy.name}, 路径: ${strategy.path}`);
            if (fs.existsSync(strategy.path)) {
              selectedStrategy = strategy;
              console.log(`[AutoLaunch] 选择策略: ${strategy.name}`);
              break;
            }
          }

          if (!selectedStrategy) {
            throw new Error('无法找到有效的应用启动路径');
          }

          // 如果要禁用开机自启，先清除所有可能的设置
          if (!enable) {
            console.log(`[AutoLaunch] 禁用开机自启，清除所有策略的设置`);
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
                console.log(`[AutoLaunch] 清除策略: ${strategy.name}`);
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

          console.log(`[AutoLaunch] 设置参数:`, loginSettings);
          app.setLoginItemSettings(loginSettings);

          // 验证设置结果
          const confirmOptions: { path: string; args?: string[] } = {
            path: selectedStrategy.path
          };
          if (selectedStrategy.args) {
            confirmOptions.args = selectedStrategy.args;
          }

          const confirmed = app.getLoginItemSettings(confirmOptions);
          console.log(`[AutoLaunch] 验证结果:`, confirmed);

          // 额外验证：检查是否真的设置成功
          const isActuallySet = confirmed.openAtLogin === enable;
          if (!isActuallySet) {
            console.warn(`[AutoLaunch] 设置验证失败: 期望=${enable}, 实际=${confirmed.openAtLogin}`);
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
        console.error(`[AutoLaunch] 设置失败:`, error);
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
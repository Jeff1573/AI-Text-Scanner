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
      async (event, request: TranslateRequest) => {
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
      async (event, request: ImageAnalysisRequest) => {
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

    ipcMain.handle("validate-openai-config", async (event) => {
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

    ipcMain.handle("get-openai-models", async (event) => {
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
        let options: any = undefined;
        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const updateExe = path.resolve(appFolder, '..', 'Update.exe');
          if (fs.existsSync(updateExe)) {
            const exeName = path.basename(process.execPath);
            options = { 
              path: updateExe, 
              args: ['--processStart', `"${exeName}"`] 
            };
          }
        }
        const settings = app.getLoginItemSettings(options);
        return { success: true, openAtLogin: settings.openAtLogin, raw: settings };
      } catch (error: any) {
        return { success: false, error: error?.message || String(error) };
      }
    });

    ipcMain.handle('set-login-item-settings', async (_event, enable: boolean) => {
      try {
        if (process.platform === 'win32') {
          const appFolder = path.dirname(process.execPath);
          const updateExe = path.resolve(appFolder, '..', 'Update.exe');
          const exeName = path.basename(process.execPath);
          if (fs.existsSync(updateExe)) {
            app.setLoginItemSettings({
              openAtLogin: enable,
              path: updateExe,
              args: ['--processStart', `"${exeName}"`],
            });
          } else {
            app.setLoginItemSettings({ openAtLogin: enable, enabled: enable });
          }
        } else {
          app.setLoginItemSettings({ openAtLogin: enable });
        }
        const confirmed = app.getLoginItemSettings();
        return { success: true, openAtLogin: confirmed.openAtLogin };
      } catch (error: any) {
        return { success: false, error: error?.message || String(error) };
      }
    });
  }
}
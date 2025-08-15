import { app, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ConfigProvider, Config, SaveResult } from "../types";
import { createModuleLogger } from "../utils/logger";

// 创建ConfigManager日志器
const logger = createModuleLogger('ConfigManager');

export class ConfigManager {
  private configPath: string;
  private configCache: ConfigProvider | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5秒缓存
  private configUpdateCallbacks: Array<() => void> = [];

  constructor() {
    this.configPath = this.getConfigPath();
  }

  private getConfigPath(): string {
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, "config.json");
  }

  loadConfigFromDisk(): ConfigProvider | null {
    try {
      if (!fs.existsSync(this.configPath)) return null;
      const configData = fs.readFileSync(this.configPath, "utf8");
      const parsed: Config = JSON.parse(configData);
      return parsed.provider?.[0] ?? null;
    } catch {
      return null;
    }
  }

  getLatestConfig(): ConfigProvider | null {
    try {
      // 检查缓存是否有效
      const now = Date.now();
      if (this.configCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        return this.configCache;
      }

      const config = this.loadConfigFromDisk();
      
      if (config) {
        logger.debug("成功从配置文件读取配置");
        this.configCache = config;
        this.cacheTimestamp = now;
        return config;
      }
      
      logger.debug("配置文件不存在或为空，返回null");
      return null;
    } catch (error) {
      logger.error("获取最新配置时发生错误", { error: error.message });
      return null;
    }
  }

  private invalidateCache(): void {
    this.configCache = null;
    this.cacheTimestamp = 0;
  }

  // 添加配置更新监听器
  onConfigUpdate(callback: () => void): void {
    this.configUpdateCallbacks.push(callback);
  }

  // 通知所有监听器配置已更新
  private notifyConfigUpdate(): void {
    this.configUpdateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error("配置更新回调执行失败", { error: error.message });
      }
    });
  }

  getLatestConfigWithDefaults(defaultConfig: Partial<ConfigProvider> = {}): ConfigProvider {
    try {
      // 使用缓存机制获取配置
      const config = this.getLatestConfig();
      
      const fullDefaultConfig: ConfigProvider = {
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o",
        customModel: "",
        sourceLang: "auto",
        targetLang: "zh",
        resultHotkey: "CommandOrControl+Shift+T",
        screenshotHotkey: "CommandOrControl+Shift+S",
        autoLaunch: false,
        ...defaultConfig
      };
      
      if (config) {
        logger.debug("成功从配置文件读取配置，合并默认值");
        return {
          ...fullDefaultConfig,
          ...config
        };
      }
      
      logger.debug("配置文件不存在或为空，返回默认配置");
      return fullDefaultConfig;
    } catch (error) {
      logger.error("获取最新配置时发生错误，返回默认配置", { error: error.message });
      return {
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o",
        customModel: "",
        sourceLang: "auto",
        targetLang: "zh",
        resultHotkey: "CommandOrControl+Shift+T",
        screenshotHotkey: "CommandOrControl+Shift+S",
        autoLaunch: false,
        ...defaultConfig
      };
    }
  }

  async saveConfig(config: ConfigProvider, applyHotkeysCallback?: () => void): Promise<SaveResult> {
    try {
      logger.debug("保存配置", { config });
      const configData: Config = {
        provider: [config],
      };

      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(configData, null, 2), "utf8");
      logger.info("配置保存成功", { configPath: this.configPath });
      
      // 保存后清除缓存并通知更新
      this.invalidateCache();
      this.notifyConfigUpdate();

      if (applyHotkeysCallback) {
        try {
          const applied = applyHotkeysCallback();
          return {
            success: true,
            hotkeyStatus: applied.status,
            hotkeys: applied.hotkeys,
          };
        } catch (e) {
          logger.error("应用快捷键配置失败", { error: e.message });
          return {
            success: true,
            hotkeyStatus: { resultRegistered: false, screenshotRegistered: false },
          };
        }
      }

      return { success: true };
    } catch (error) {
      logger.error("保存配置失败", { error: error instanceof Error ? error.message : "未知错误" });
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  registerIPCHandlers(applyHotkeysCallback?: () => void): void {
    ipcMain.handle("save-config", async (event, config: ConfigProvider) => {
      return this.saveConfig(config, applyHotkeysCallback);
    });

    ipcMain.handle("load-config", async () => {
      try {
        if (!fs.existsSync(this.configPath)) {
          logger.debug("配置文件不存在，返回默认配置");
          return {
            success: true,
            config: null,
          };
        }

        const configData = fs.readFileSync(this.configPath, "utf8");
        const config: Config = JSON.parse(configData);

        logger.debug("配置加载成功", { config });
        return {
          success: true,
          config: config.provider[0] || null,
        };
      } catch (error) {
        logger.error("加载配置失败", { error: error.message });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          config: null,
        };
      }
    });

    ipcMain.handle("get-latest-config", async (event, withDefaults = false) => {
      try {
        let config: ConfigProvider | null;
        
        if (withDefaults) {
          config = this.getLatestConfigWithDefaults();
        } else {
          config = this.getLatestConfig();
          logger.debug("获取最新配置成功");
        }
        
        return {
          success: true,
          config: config,
        };
      } catch (error) {
        logger.error("获取最新配置失败", { error: error.message });
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          config: null,
        };
      }
    });
  }
}
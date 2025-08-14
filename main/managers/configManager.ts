import { app, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import type { ConfigProvider, Config, SaveResult } from "../types";

export class ConfigManager {
  private configPath: string;
  private configCache: ConfigProvider | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5秒缓存

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
        console.log("成功从配置文件读取配置");
        this.configCache = config;
        this.cacheTimestamp = now;
        return config;
      }
      
      console.log("配置文件不存在或为空，返回null");
      return null;
    } catch (error) {
      console.error("获取最新配置时发生错误:", error);
      return null;
    }
  }

  private invalidateCache(): void {
    this.configCache = null;
    this.cacheTimestamp = 0;
  }

  getLatestConfigWithDefaults(defaultConfig: Partial<ConfigProvider> = {}): ConfigProvider {
    try {
      const config = this.loadConfigFromDisk();
      
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
        console.log("成功从配置文件读取配置，合并默认值");
        return {
          ...fullDefaultConfig,
          ...config
        };
      }
      
      console.log("配置文件不存在或为空，返回默认配置");
      return fullDefaultConfig;
    } catch (error) {
      console.error("获取最新配置时发生错误，返回默认配置:", error);
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

  async saveConfig(config: ConfigProvider, applyHotkeysCallback?: () => any): Promise<SaveResult> {
    try {
      console.log("save-config", config);
      const configData: Config = {
        provider: [config],
      };

      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(configData, null, 2), "utf8");
      console.log("配置保存成功:", this.configPath);
      
      // 保存后清除缓存
      this.invalidateCache();

      if (applyHotkeysCallback) {
        try {
          const applied = applyHotkeysCallback();
          return {
            success: true,
            hotkeyStatus: applied.status,
            hotkeys: applied.hotkeys,
          };
        } catch (e) {
          console.error("应用快捷键配置失败:", e);
          return {
            success: true,
            hotkeyStatus: { resultRegistered: false, screenshotRegistered: false },
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("保存配置失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  registerIPCHandlers(applyHotkeysCallback?: () => any): void {
    ipcMain.handle("save-config", async (event, config: ConfigProvider) => {
      return this.saveConfig(config, applyHotkeysCallback);
    });

    ipcMain.handle("load-config", async () => {
      try {
        if (!fs.existsSync(this.configPath)) {
          console.log("配置文件不存在，返回默认配置");
          return {
            success: true,
            config: null,
          };
        }

        const configData = fs.readFileSync(this.configPath, "utf8");
        const config: Config = JSON.parse(configData);

        console.log("配置加载成功:", config);
        return {
          success: true,
          config: config.provider[0] || null,
        };
      } catch (error) {
        console.error("加载配置失败:", error);
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
          console.log("获取最新配置成功");
        }
        
        return {
          success: true,
          config: config,
        };
      } catch (error) {
        console.error("获取最新配置失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          config: null,
        };
      }
    });
  }
}
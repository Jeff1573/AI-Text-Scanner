import {
  app,
  BrowserWindow,
  desktopCapturer,
  session,
  ipcMain,
  screen,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  clipboard,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import type { ScreenSource, ConfigProvider, Config } from "./types";
import {
  analyzeImageWithOpenAI,
  validateOpenAIConfig,
  getAvailableOpenAIModels,
  translateText,
  type APIConfig,
  type ImageAnalysisRequest,
  type TranslateRequest,
} from "./utils/openaiService";

// Vite注入的变量声明
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let screenshotWindow: BrowserWindow | null = null;
// 新增：结果窗口
let resultWindow: BrowserWindow | null = null;
// 新增：系统托盘
let tray: Tray | null = null;
// 记录当前已注册的快捷键，便于更新
let currentHotkeys: { resultHotkey: string; screenshotHotkey: string } = {
  resultHotkey: "CommandOrControl+Shift+T",
  screenshotHotkey: "CommandOrControl+Shift+S",
};

const DEFAULT_HOTKEYS = { ...currentHotkeys };

// 单实例锁，防止重复启动
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // 监听第二个实例启动事件，聚焦现有窗口
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// 读取磁盘中的配置（同步）
const loadConfigFromDisk = (): ConfigProvider | null => {
  try {
    const userDataPath = app.getPath("userData");
    const configPath = path.join(userDataPath, "config.json");
    if (!fs.existsSync(configPath)) return null;
    const configData = fs.readFileSync(configPath, "utf8");
    const parsed: Config = JSON.parse(configData);
    return parsed.provider?.[0] ?? null;
  } catch {
    return null;
  }
};

/**
 * 获取最新配置的函数
 * 从配置文件读取最新的配置信息，支持默认值和错误处理
 * @returns {ConfigProvider | null} 返回配置对象，如果读取失败则返回null
 */
const getLatestConfig = (): ConfigProvider | null => {
  try {
    // 从磁盘读取配置
    const config = loadConfigFromDisk();
    
    if (config) {
      console.log("成功从配置文件读取配置");
      return config;
    }
    
    console.log("配置文件不存在或为空，返回null");
    return null;
  } catch (error) {
    console.error("获取最新配置时发生错误:", error);
    return null;
  }
};

/**
 * 获取最新配置的函数（带默认值）
 * 从配置文件读取最新的配置信息，如果读取失败则返回默认配置
 * @param {Partial<ConfigProvider>} defaultConfig - 默认配置对象
 * @returns {ConfigProvider} 返回配置对象，包含默认值
 */
const getLatestConfigWithDefaults = (defaultConfig: Partial<ConfigProvider> = {}): ConfigProvider => {
  try {
    // 从磁盘读取配置
    const config = loadConfigFromDisk();
    
    // 定义完整的默认配置
    const fullDefaultConfig: ConfigProvider = {
      apiUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o",
      customModel: "",
      sourceLang: "auto",
      targetLang: "zh",
      resultHotkey: "CommandOrControl+Shift+T",
      screenshotHotkey: "CommandOrControl+Shift+S",
      ...defaultConfig
    };
    
    if (config) {
      console.log("成功从配置文件读取配置，合并默认值");
      // 合并配置，确保所有必需字段都存在
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
      ...defaultConfig
    };
  }
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false, // 隐藏默认标题栏
    titleBarStyle: "hidden", // 隐藏标题栏
    autoHideMenuBar: true, // 隐藏顶部菜单栏
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 设置桌面捕获权限处理
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
        // 授权访问第一个找到的屏幕
        callback({ video: sources[0] });
      });
    },
    { useSystemPicker: true }
  );

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/index.html`));
  }

  // 开发模式下添加F12键监听，用于打开开发者工具
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  // 监听键盘事件
  mainWindow.webContents.on("before-input-event", (event, input) => {
    // 检查是否按下了F12键
    if (input.key === "F12") {
      // 阻止默认行为
      event.preventDefault();
      // 打开开发者工具
      mainWindow?.webContents.openDevTools();
    }
  });
  // }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// 创建系统托盘
const createTray = () => {
  // 从配置读取热键以展示在菜单加速器
  const cfg = getLatestConfigWithDefaults();
  const hotkeys = {
    resultHotkey: cfg.resultHotkey || DEFAULT_HOTKEYS.resultHotkey,
    screenshotHotkey: cfg.screenshotHotkey || DEFAULT_HOTKEYS.screenshotHotkey,
  };
  // 创建托盘图标
  // 使用一个简单的纯色图标
  // 在开发环境和生产环境中使用不同的路径解析策略
  let iconPath: string;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // 开发环境：直接使用源码目录
    iconPath = path.join(__dirname, "./static/fast_ocr_tray_icon.ico");
  } else {
    // 生产环境：使用构建后的路径
    iconPath = path.join(__dirname, "./static/fast_ocr_tray_icon.ico");
  }

  console.log("iconPath", __dirname,iconPath);
  const icon = nativeImage.createFromPath(iconPath);

  // 创建托盘实例
  tray = new Tray(icon);
  tray.setToolTip("Fast OCR - AI文字识别工具");

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示主窗口",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.focus();
          } else {
            mainWindow.show();
          }
        } else {
          createWindow();
        }
      },
    },
    {
      label: "截图识别",
      accelerator: hotkeys.screenshotHotkey.replace(
        "CommandOrControl",
        "CmdOrCtrl"
      ),
      click: async () => {
        try {
          // 隐藏当前应用窗口
          if (mainWindow) {
            mainWindow.hide();
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 1920, height: 1080 },
          });

          if (sources.length === 0) {
            throw new Error("没有找到可用的屏幕");
          }

          const screenshotData = {
            id: sources[0].id,
            name: sources[0].name,
            thumbnail: sources[0].thumbnail.toDataURL(),
          };

          // 截图完成后恢复窗口显示
          if (mainWindow) {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true);
            mainWindow.maximize();
            mainWindow.webContents.send(
              "open-screenshot-viewer",
              screenshotData
            );
          }
        } catch (error) {
          console.error("截图过程中发生错误:", error);
          if (mainWindow) {
            mainWindow.show();
          }
        }
      },
    },
    {
      label: "快捷翻译",
      accelerator: hotkeys.resultHotkey.replace(
        "CommandOrControl",
        "CmdOrCtrl"
      ),
      click: () => {
        console.log("托盘菜单快捷翻译被点击");
        // 获取剪贴板内容作为默认内容
        const clipboardText = clipboard.readText();
        // 如果剪贴板有内容，将其作为原文，否则使用空内容
        const defaultContent = clipboardText
          ? JSON.stringify({ original: clipboardText, translated: "" })
          : '{"original": "", "translated": ""}';
        createResultWindow(defaultContent);
      },
    },
    { type: "separator" },
    {
      label: "设置",
      click: () => {
        if (!mainWindow) {
          createWindow();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("open-settings-page");
        }
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    },
  ]);

  // 设置托盘菜单
  tray.setContextMenu(contextMenu);

  // 托盘图标点击事件
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });

  // 托盘图标双击事件
  tray.on("double-click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
};

// 确保截图窗口已创建并完成加载（预热复用）
const ensureScreenshotWindow = () => {
  if (screenshotWindow && !screenshotWindow.isDestroyed()) {
    return screenshotWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  screenshotWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  // 加载截图展示页面
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`;
    console.log("预热加载URL:", url);
    screenshotWindow.loadURL(url);
  } else {
    screenshotWindow.loadFile(path.join(__dirname, `../renderer/index.html`), {
      hash: "/screenshot",
    });
  }

  // 接收渲染进程就绪信号后再显示窗口（进一步避免白屏）
  ipcMain.on("screenshot-image-ready", () => {
    if (screenshotWindow && !screenshotWindow.isDestroyed()) {
      if (!screenshotWindow.isVisible()) {
        screenshotWindow.show();
        screenshotWindow.focus();
      }
    }
  });

  // 错误处理和清理
  screenshotWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("窗口加载失败:", errorCode, errorDescription);
    }
  );
  screenshotWindow.on("closed", () => {
    screenshotWindow = null;
  });

  return screenshotWindow;
};

// 使用已预热窗口发送数据并显示
const createScreenshotWindow = (screenshotData: ScreenSource) => {
  const win = ensureScreenshotWindow();
  // 默认策略：先发送数据，待渲染首帧后再显示
  const sendOnly = () => {
    if (!win.isDestroyed()) {
      win.webContents.send("screenshot-data", screenshotData);
    }
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", sendOnly);
  } else {
    sendOnly();
  }
};

// 注册全局快捷键（根据传入配置）
const registerGlobalShortcuts = (hotkeys: {
  resultHotkey: string;
  screenshotHotkey: string;
}) => {
  // 先注销已存在快捷键，避免重复
  globalShortcut.unregisterAll();
  currentHotkeys = hotkeys;

  const { resultHotkey, screenshotHotkey } = hotkeys;

  // 打开结果窗口
  const ret1 = globalShortcut.register(resultHotkey, () => {
    console.log("全局快捷键被触发，准备直接打开结果窗口");

    // 获取剪贴板内容作为默认内容
    const clipboardText = clipboard.readText();
    // 如果剪贴板有内容，将其作为原文，否则使用空内容
    const defaultContent = clipboardText
      ? JSON.stringify({ original: clipboardText, translated: "" })
      : '{"original": "", "translated": ""}';

    // 直接调用 createResultWindow 函数
    createResultWindow(defaultContent);
  });

  // 截图识别
  const ret2 = globalShortcut.register(screenshotHotkey, async () => {
    console.log("全局快捷键被触发，准备启动截图功能");

    // 执行截图
    try {
      // 隐藏当前应用窗口
      if (mainWindow) {
        mainWindow.hide();
        // 等待一小段时间确保窗口完全隐藏
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      if (sources.length === 0) {
        throw new Error("没有找到可用的屏幕");
      }

      const screenshotData = {
        id: sources[0].id,
        name: sources[0].name,
        thumbnail: sources[0].thumbnail.toDataURL(),
      };

      // 使用已预热窗口，先发数据后显示
      createScreenshotWindow(screenshotData);
    } catch (error) {
      console.error("截图过程中发生错误:", error);
      // 即使截图失败也要恢复窗口显示
      if (mainWindow) {
        mainWindow.show();
      }
    }
  });

  if (!ret1) {
    console.log("ResultPage全局快捷键注册失败");
  } else {
    console.log(`ResultPage全局快捷键注册成功: ${resultHotkey}`);
  }

  if (!ret2) {
    console.log("ScreenshotViewer全局快捷键注册失败");
  } else {
    console.log(`ScreenshotViewer全局快捷键注册成功: ${screenshotHotkey}`);
  }
  return { resultRegistered: !!ret1, screenshotRegistered: !!ret2 };
};

// 从配置更新快捷键与托盘菜单
const applyHotkeysFromConfig = () => {
  const cfg = getLatestConfigWithDefaults();
  const hotkeys = {
    resultHotkey: cfg.resultHotkey || DEFAULT_HOTKEYS.resultHotkey,
    screenshotHotkey: cfg.screenshotHotkey || DEFAULT_HOTKEYS.screenshotHotkey,
  };
  const status = registerGlobalShortcuts(hotkeys);
  // 重建托盘菜单以更新加速器显示
  if (tray) {
    tray.destroy();
    tray = null;
  }
  createTray();
  return { hotkeys, status };
};

// 新增：创建结果窗口函数
const createResultWindow = (resultContent: string) => {
  if (resultWindow) {
    resultWindow.close();
  }
  resultWindow = new BrowserWindow({
    width: 600,
    height: 400,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false, // 隐藏默认标题栏
    titleBarStyle: "hidden", // 隐藏标题栏
  });

  // 加载结果页面（可用hash区分）
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    resultWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/result`);
    // resultWindow.webContents.openDevTools();
  } else {
    resultWindow.loadFile(path.join(__dirname, `../renderer/index.html`), {
      hash: "/result",
    });
  }

  // 传递识别结果
  resultWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      if (resultWindow && !resultWindow.isDestroyed()) {
        resultWindow.webContents.send("result-data", resultContent);
      }
    }, 300);
  });

  resultWindow.on("closed", () => {
    resultWindow = null;
  });
};

// 新增：IPC handler
ipcMain.handle("open-result-window", async (event, resultContent) => {
  try {
    createResultWindow(resultContent);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 新增：获取剪贴板内容的 IPC handler
ipcMain.handle("get-clipboard-text", async () => {
  try {
    const text = clipboard.readText();
    return { success: true, text };
  } catch (error) {
    return { success: false, error: error.message, text: "" };
  }
});

// 类型定义已移至 main/types.ts

// 处理屏幕截图请求
ipcMain.handle("capture-screen", async () => {
  try {
    // 隐藏当前应用窗口
    if (mainWindow) {
      mainWindow.hide();

      // 等待一小段时间确保窗口完全隐藏
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) {
      throw new Error("没有找到可用的屏幕");
    }

    // 返回第一个屏幕的信息
    const result = {
      success: true,
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      })),
    };

    // 截图完成后恢复窗口显示
    if (mainWindow) {
      mainWindow.show();
    }

    return result;
  } catch (error) {
    // 即使截图失败也要恢复窗口显示
    if (mainWindow) {
      mainWindow.show();
    }

    return {
      success: false,
      error: error.message,
    };
  }
});

// 处理创建截图展示窗口请求
ipcMain.handle("create-screenshot-window", async (event, screenshotData) => {
  try {
    console.log("received create screenshot window request, data:");
    createScreenshotWindow(screenshotData);
    return { success: true };
  } catch (error) {
    console.error("创建截图窗口失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// 获取配置文件路径
const getConfigPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "config.json");
};

// 保存配置到文件
ipcMain.handle("save-config", async (event, config: ConfigProvider) => {
  try {
    console.log("save-config", config);
    const configPath = getConfigPath();
    const configData: Config = {
      provider: [config],
    };

    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 写入配置文件
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
    console.log("配置保存成功:", configPath);

    // 保存成功后应用新的快捷键并刷新托盘菜单
    try {
      const applied = applyHotkeysFromConfig();
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
  } catch (error) {
    console.error("保存配置失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// 监听渲染进程请求：保存设置后应用快捷键（可选，当前通过读取磁盘实现，无需额外IPC）

// 加载配置从文件
ipcMain.handle("load-config", async () => {
  try {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
      console.log("配置文件不存在，返回默认配置");
      return {
        success: true,
        config: null,
      };
    }

    const configData = fs.readFileSync(configPath, "utf8");
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
      error: error.message,
      config: null,
    };
  }
});

// 获取最新配置的IPC处理器
ipcMain.handle("get-latest-config", async (event, withDefaults = false) => {
  try {
    let config: ConfigProvider | null;
    
    if (withDefaults) {
      config = getLatestConfigWithDefaults();
      // console.log("获取最新配置（带默认值）成功");
    } else {
      config = getLatestConfig();
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
      error: error.message,
      config: null,
    };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  // 创建系统托盘
  createTray();

  // 预热截图窗口
  ensureScreenshotWindow();

  // 注册全局快捷键
  applyHotkeysFromConfig();
});

// 开机自启动：IPC - 获取与设置
ipcMain.handle('get-login-item-settings', async () => {
  try {
    // 为确保 Windows 下与 setLoginItemSettings 一致，可按需提供 path/args
    let options: any = undefined;
    if (process.platform === 'win32') {
      // 若打包为 Squirrel，尽量读取 Update.exe 路径；否则采用默认
      const appFolder = path.dirname(process.execPath);
      const updateExe = path.resolve(appFolder, '..', 'Update.exe');
      if (fs.existsSync(updateExe)) {
        const exeName = path.basename(process.execPath);
        options = { path: updateExe, args: [
          '--processStart', `"${exeName}"`
        ] };
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
          enabled: enable,
          path: updateExe,
          args: ['--processStart', `"${exeName}"`]
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

// 当所有窗口关闭时，不退出应用，而是隐藏到托盘
app.on("window-all-closed", () => {
  // 在Windows和Linux上，隐藏窗口而不是退出应用
  if (process.platform !== "darwin") {
    // 不调用app.quit()，让应用继续在托盘中运行
    return;
  }
});

// 应用退出时注销全局快捷键
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// OpenAI API相关IPC处理器

// 处理翻译请求
ipcMain.handle(
  "translate-text",
  async (event, request: TranslateRequest) => {
    try {
      console.log("收到文本翻译请求:", request);
      
      // 获取最新配置
      const config = getLatestConfigWithDefaults();
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

// 处理图片分析请求
ipcMain.handle(
  "analyze-image-openai",
  async (event, request: ImageAnalysisRequest) => {
    try {
      // 获取最新配置
      const config = getLatestConfigWithDefaults();
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

// 验证OpenAI API配置
ipcMain.handle("validate-openai-config", async (event) => {
  try {
    // 获取最新配置
    const config = getLatestConfigWithDefaults();
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

// 获取可用的OpenAI模型列表
ipcMain.handle("get-openai-models", async (event) => {
  try {
    // 获取最新配置
    const config = getLatestConfigWithDefaults();
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

// 窗口控制功能IPC处理器
ipcMain.handle("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
});

ipcMain.handle("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

// 托盘相关IPC处理器
ipcMain.handle("hide-to-tray", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.hide();
  }
});

ipcMain.handle("show-from-tray", () => {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  } else {
    createWindow();
  }
});

ipcMain.handle("is-tray-available", () => {
  return true; // 现代系统都支持托盘
});

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
declare const MAIN_WINDOW_VITE_NAME: string;

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
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // 开发模式下添加F12键监听，用于打开开发者工具
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
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
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// 创建系统托盘
const createTray = () => {
  // 创建托盘图标
  // 使用一个简单的纯色图标
  const iconPath = path.join(__dirname, './static/tray-icon.svg');
  console.log('iconPath', path.join(__dirname));
  const icon = nativeImage.createFromPath(iconPath);
  
  // 创建托盘实例
  tray = new Tray(icon);
  tray.setToolTip('Fast OCR - AI文字识别工具');
  
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
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
      }
    },
    {
      label: '截图识别',
      accelerator: 'CmdOrCtrl+Shift+S',
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
            mainWindow.webContents.send('open-screenshot-viewer', screenshotData);
          }
        } catch (error) {
          console.error('截图过程中发生错误:', error);
          if (mainWindow) {
            mainWindow.show();
          }
        }
      }
    },
    {
      label: '快捷翻译',
      accelerator: 'CmdOrCtrl+Shift+T',
      click: () => {
        console.log('托盘菜单快捷翻译被点击');
        // 获取剪贴板内容作为默认内容
        const clipboardText = clipboard.readText();
        // 如果剪贴板有内容，将其作为原文，否则使用空内容
        const defaultContent = clipboardText
          ? JSON.stringify({ original: clipboardText, translated: "" })
          : '{"original": "", "translated": ""}';
        createResultWindow(defaultContent);
      }
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        if (!mainWindow) {
          createWindow();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('open-settings-page');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu);
  
  // 托盘图标点击事件
  tray.on('click', () => {
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
  tray.on('double-click', () => {
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

// 创建截图展示窗口
const createScreenshotWindow = (screenshotData: ScreenSource) => {
  console.log("创建截图窗口，数据:", screenshotData);

  // 关闭已存在的截图窗口
  if (screenshotWindow) {
    screenshotWindow.close();
  }

  // 获取主显示器的尺寸
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  screenshotWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    fullscreen: true,
    autoHideMenuBar: true, // 隐藏顶部菜单栏
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 打开开发者工具用于调试
  // screenshotWindow.webContents.openDevTools();

  // 加载截图展示页面
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`;
    console.log("加载URL:", url);
    screenshotWindow.loadURL(url);
  } else {
    screenshotWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      {
        hash: "/screenshot",
      }
    );
  }

  // 传递截图数据到新窗口 - 改进时机
  screenshotWindow.webContents.on("did-finish-load", () => {
    console.log("窗口加载完成，准备发送数据");
    // 延迟一点时间确保组件已经挂载
    setTimeout(() => {
      if (screenshotWindow && !screenshotWindow.isDestroyed()) {
        // console.log('发送截图数据到新窗口:', screenshotData);
        screenshotWindow.webContents.send("screenshot-data", screenshotData);
      }
    }, 500);
  });

  // 添加错误处理
  screenshotWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("窗口加载失败:", errorCode, errorDescription);
    }
  );

  // 窗口关闭时清理引用
  screenshotWindow.on("closed", () => {
    screenshotWindow = null;
  });
};

// 注册全局快捷键
const registerGlobalShortcuts = () => {
  // 注册 CommandOrControl+Shift+T 快捷键来直接打开结果窗口
  const ret1 = globalShortcut.register('CommandOrControl+Shift+T', () => {
    console.log('全局快捷键被触发，准备直接打开结果窗口');

    // 获取剪贴板内容作为默认内容
    const clipboardText = clipboard.readText();
    // 如果剪贴板有内容，将其作为原文，否则使用空内容
    const defaultContent = clipboardText
      ? JSON.stringify({ original: clipboardText, translated: "" })
      : '{"original": "", "translated": ""}';

    // 直接调用 createResultWindow 函数
    createResultWindow(defaultContent);
  });

  // 注册 Ctrl+Shift+S 快捷键来启动截图功能
  const ret2 = globalShortcut.register('CommandOrControl+Shift+S', async () => {
    console.log('全局快捷键被触发，准备启动截图功能');
    
    // 如果主窗口不存在，先创建它
    if (!mainWindow) {
      createWindow();
    }
    
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

      // 截图完成后恢复窗口显示
      if (mainWindow) {
        mainWindow.show();
      }

      // 通过IPC通知渲染进程启动截图查看器
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true);
        // 窗口最大化
        mainWindow.maximize();
        mainWindow.webContents.send('open-screenshot-viewer', screenshotData);
      }
    } catch (error) {
      console.error('截图过程中发生错误:', error);
      // 即使截图失败也要恢复窗口显示
      if (mainWindow) {
        mainWindow.show();
      }
    }
  });

  if (!ret1) {
    console.log('ResultPage全局快捷键注册失败');
  } else {
    console.log('ResultPage全局快捷键注册成功: CommandOrControl+Shift+T');
  }

  if (!ret2) {
    console.log('ScreenshotViewer全局快捷键注册失败');
  } else {
    console.log('ScreenshotViewer全局快捷键注册成功: CommandOrControl+Shift+S');
  }
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
    resultWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      {
        hash: "/result",
      }
    );
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

    return { success: true };
  } catch (error) {
    console.error("保存配置失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
  
  // 创建系统托盘
  createTray();
  
  // 注册全局快捷键
  registerGlobalShortcuts();
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
  async (event, config: APIConfig, request: TranslateRequest) => {
    try {
      console.log("收到文本翻译请求:", request);
      const result = await translateText(config, request);
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
  async (event, config: APIConfig, request: ImageAnalysisRequest) => {
    try {
      const result = await analyzeImageWithOpenAI(config, request);

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
ipcMain.handle("validate-openai-config", async (event, config: APIConfig) => {
  try {
    console.log("验证OpenAI API配置:", {
      apiUrl: config.apiUrl,
      hasApiKey: !!config.apiKey,
    });

    const isValid = await validateOpenAIConfig(config);

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
ipcMain.handle("get-openai-models", async (event, config: APIConfig) => {
  try {
    console.log("获取OpenAI模型列表:", {
      apiUrl: config.apiUrl,
      hasApiKey: !!config.apiKey,
    });

    const models = await getAvailableOpenAIModels(config);

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

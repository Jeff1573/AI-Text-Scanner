import { app, BrowserWindow, desktopCapturer, session, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import type { ScreenSource, ConfigProvider, Config } from './types';

// Vite注入的变量声明
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let screenshotWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true, // 隐藏顶部菜单栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 设置桌面捕获权限处理
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // 授权访问第一个找到的屏幕
      callback({ video: sources[0] });
    });
  }, { useSystemPicker: true });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // 开发模式下添加F12键监听，用于打开开发者工具
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // 监听键盘事件
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // 检查是否按下了F12键
      if (input.key === 'F12') {
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

// 创建截图展示窗口
const createScreenshotWindow = (screenshotData: ScreenSource) => {
  console.log('创建截图窗口，数据:', screenshotData);
  
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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 打开开发者工具用于调试
  // screenshotWindow.webContents.openDevTools();

  // 加载截图展示页面
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/screenshot`;
    console.log('加载URL:', url);
    screenshotWindow.loadURL(url);
  } else {
    screenshotWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      hash: '/screenshot'
    });
  }

  // 传递截图数据到新窗口 - 改进时机
  screenshotWindow.webContents.on('did-finish-load', () => {
    console.log('窗口加载完成，准备发送数据');
    // 延迟一点时间确保组件已经挂载
    setTimeout(() => {
      if (screenshotWindow && !screenshotWindow.isDestroyed()) {
        // console.log('发送截图数据到新窗口:', screenshotData);
        screenshotWindow.webContents.send('screenshot-data', screenshotData);
      }
    }, 500);
  });

  // 添加错误处理
  screenshotWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('窗口加载失败:', errorCode, errorDescription);
  });

  // 窗口关闭时清理引用
  screenshotWindow.on('closed', () => {
    screenshotWindow = null;
  });
};

// 类型定义已移至 main/types.ts

// 处理屏幕截图请求
ipcMain.handle('capture-screen', async () => {
  try {
    // 隐藏当前应用窗口
    if (mainWindow) {
      mainWindow.hide();
      
      // 等待一小段时间确保窗口完全隐藏
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length === 0) {
      throw new Error('没有找到可用的屏幕');
    }
    
    // 返回第一个屏幕的信息
    const result = {
      success: true,
      sources: sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
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
      error: error.message
    };
  }
});

// 处理创建截图展示窗口请求
ipcMain.handle('create-screenshot-window', async (event, screenshotData) => {
  try {
    console.log('received create screenshot window request, data:');
    createScreenshotWindow(screenshotData);
    return { success: true };
  } catch (error) {
    console.error('创建截图窗口失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 获取配置文件路径
const getConfigPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
};

// 保存配置到文件
ipcMain.handle('save-config', async (event, config: ConfigProvider) => {
  try {
    const configPath = getConfigPath();
    const configData: Config = {
      provider: [config]
    };
    
    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // 写入配置文件
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    console.log('配置保存成功:', configPath);
    
    return { success: true };
  } catch (error) {
    console.error('保存配置失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 加载配置从文件
ipcMain.handle('load-config', async () => {
  try {
    const configPath = getConfigPath();
    
    if (!fs.existsSync(configPath)) {
      console.log('配置文件不存在，返回默认配置');
      return {
        success: true,
        config: null
      };
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const config: Config = JSON.parse(configData);
    
    console.log('配置加载成功:', config);
    return {
      success: true,
      config: config.provider[0] || null
    };
  } catch (error) {
    console.error('加载配置失败:', error);
    return {
      success: false,
      error: error.message,
      config: null
    };
  }
});



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

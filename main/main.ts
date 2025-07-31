import { app, BrowserWindow, desktopCapturer, session, ipcMain, screen } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

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
  console.log("MAIN_WINDOW_VITE_DEV_SERVER_URL", MAIN_WINDOW_VITE_DEV_SERVER_URL);
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 打开开发者工具用于调试
  screenshotWindow.webContents.openDevTools();

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
        console.log('发送截图数据到新窗口:', screenshotData);
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

// 添加ScreenSource类型定义
interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

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
    console.log('收到创建截图窗口请求，数据:', screenshotData);
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

// 处理获取选中内容请求
ipcMain.handle('get-selected-content', async (event, { imageData, selection }) => {
  try {
    console.log('收到获取选中内容请求:', { selection });
    
    // 这里可以添加处理选中内容的逻辑
    // 比如保存到文件、发送到其他应用等
    
    return {
      success: true,
      selectedImageData: imageData,
      selection: selection
    };
  } catch (error) {
    console.error('获取选中内容失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理发送选中图片数据请求
ipcMain.handle('send-selected-image', async (event, data) => {
  try {
    console.log('收到发送选中图片数据请求:', { selection: data.selection });
    
    // 发送数据到主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('selected-image-data', {
        imageData: data.imageData,
        selection: {
          width: data.selection.width,
          height: data.selection.height
        }
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('发送选中图片数据失败:', error);
    return {
      success: false,
      error: error.message
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

import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

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

// 创建截图窗口
let captureWindow: BrowserWindow | null = null;

// 处理截图请求
ipcMain.handle('start-screen-capture', async () => {
  try {
    // 创建一个透明的全屏窗口用于截图
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // 创建截图窗口
    if (!captureWindow) {
      captureWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        show: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        fullscreen: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      
      // 加载截图界面
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        captureWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/capture`);
      } else {
        captureWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash: 'capture' });
      }
      
      captureWindow.on('closed', () => {
        captureWindow = null;
      });
    }
    
    // 等待页面加载完成
    captureWindow.once('ready-to-show', () => {
      // 显示截图窗口
      captureWindow.show();
      captureWindow.focus();
      captureWindow.setFullScreen(true);
      
      // 通知渲染进程开始截图模式
      captureWindow.webContents.send('start-direct-capture', {
        width: width,
        height: height
      });
    });
    
  } catch (error) {
    console.error('截图失败:', error);
    dialog.showErrorBox('截图失败', `无法启动截图模式: ${error.message}`);
  }
});

// 捕获屏幕区域
ipcMain.handle('capture-screen-area', async (_event, bounds: {x: number, y: number, width: number, height: number}) => {
  try {
    console.log('捕获屏幕区域:', bounds);
    
    // 创建一个隐藏的BrowserWindow来捕获屏幕
    const captureWin = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: {
        offscreen: true
      }
    });
    
    // 捕获指定区域的屏幕
    const screenshot = await captureWin.webContents.capturePage({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    });
    
    // 关闭临时窗口
    captureWin.close();
    
    // 获取图像数据URL
    const dataUrl = screenshot.toDataURL();
    
    // 保存截图
    return await saveScreenshot(dataUrl);
  } catch (error) {
    console.error('捕获屏幕区域失败:', error);
    dialog.showErrorBox('截图失败', `无法捕获屏幕区域: ${error.message}`);
    return null;
  }
});

// 保存截图函数
async function saveScreenshot(dataUrl: string) {
  try {
    // 移除 data:image/png;base64, 前缀
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 打开保存对话框
    const { filePath } = await dialog.showSaveDialog({
      title: '保存截图',
      defaultPath: path.join(app.getPath('pictures'), `截图_${new Date().toISOString().replace(/:/g, '-')}.png`),
      filters: [{ name: '图片', extensions: ['png'] }]
    });
    
    if (!filePath) {
      return null; // 用户取消了保存
    }
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    
    // 关闭截图窗口
    if (captureWindow) {
      captureWindow.hide();
    }
    
    // 通知渲染进程截图已完成
    const mainWindow = BrowserWindow.getAllWindows().find(w => w !== captureWindow);
    if (mainWindow) {
      mainWindow.webContents.send('screen-capture-complete', filePath);
    }
    
    return filePath;
  } catch (error) {
    console.error('保存截图失败:', error);
    dialog.showErrorBox('保存失败', `无法保存截图: ${error.message}`);
    return null;
  }
}

// 保存截图
ipcMain.handle('save-screen-capture', async (_event, dataUrl: string) => {
  try {
    // 移除 data:image/png;base64, 前缀
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 打开保存对话框
    const { filePath } = await dialog.showSaveDialog({
      title: '保存截图',
      defaultPath: path.join(app.getPath('pictures'), `截图_${new Date().toISOString().replace(/:/g, '-')}.png`),
      filters: [{ name: '图片', extensions: ['png'] }]
    });
    
    if (!filePath) {
      return null; // 用户取消了保存
    }
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    
    // 关闭截图窗口
    if (captureWindow) {
      captureWindow.hide();
    }
    
    // 通知渲染进程截图已完成
    const mainWindow = BrowserWindow.getAllWindows().find(w => w !== captureWindow);
    if (mainWindow) {
      mainWindow.webContents.send('screen-capture-complete', filePath);
    }
    
    return filePath;
  } catch (error) {
    console.error('保存截图失败:', error);
    dialog.showErrorBox('保存失败', `无法保存截图: ${error.message}`);
    return null;
  }
});

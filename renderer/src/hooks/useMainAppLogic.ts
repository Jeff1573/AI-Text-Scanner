import { useCallback } from "react";

/**
 * 主应用逻辑 Hook
 * 
 * 处理截图等核心业务逻辑
 */
export const useMainAppLogic = () => {
  /**
   * 智能截图方法
   * 
   * - macOS: 使用原生 screencapture（权限简单、用户体验好）
   * - Windows/Linux: 使用 Electron desktopCapturer（兼容性好）
   * 
   * @param {Function} setIsCapturing - 设置截图状态的函数
   */
  const handleCaptureScreenNative = useCallback(async (
    setIsCapturing: (capturing: boolean) => void
  ) => {
    setIsCapturing(true);
    try {
      // 获取当前平台
      const platform = await window.electronAPI.getPlatform();
      
      if (platform === 'darwin') {
        // macOS: 使用原生截图
        console.log("启动 macOS 原生截图...");
        const result = await window.electronAPI.captureScreenNative();

        if (result.success) {
          console.log("原生截图成功，预览窗口已打开");
        } else if (result.errorCode === "USER_CANCELLED") {
          console.log("用户取消截图");
        } else {
          console.error("原生截图失败:", result.error);
          alert(`截图失败: ${result.error || "未知错误"}`);
        }
      } else {
        // Windows/Linux: 使用 Electron desktopCapturer
        console.log("启动 Electron 截图...");
        const result = await window.electronAPI.captureScreen();

        if (result.success && result.sources && result.sources.length > 0) {
          // 创建 ScreenshotViewer 窗口
          const firstSource = result.sources[0];
          await window.electronAPI.createScreenshotWindow(firstSource);
        } else {
          console.error("截图失败:", result.error);
          alert(`截图失败: ${result.error || "未知错误"}`);
        }
      }
    } catch (error) {
      console.error("截图失败:", error);
      alert(`截图失败: ${error}`);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * 处理屏幕截图（原有方案，使用 Electron desktopCapturer）
   * 
   * @param {Function} setIsCapturing - 设置截图状态的函数
   */
  const handleCaptureScreen = useCallback(async (
    setIsCapturing: (capturing: boolean) => void
  ) => {
    setIsCapturing(true);
    try {
      const result = await window.electronAPI.captureScreen();

      if (result.success && result.sources && result.sources.length > 0) {
        // 直接使用第一个屏幕的截图创建新窗口
        const firstSource = result.sources[0];
        await window.electronAPI.createScreenshotWindow(firstSource);
      } else {
        console.error("截图失败:", result.error);
        alert(`截图失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("截图失败:", error);
      alert(`截图失败: ${error}`);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return {
    handleCaptureScreen,
    handleCaptureScreenNative,
  };
}; 
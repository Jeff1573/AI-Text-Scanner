import { useCallback } from "react";

/**
 * 主应用逻辑 Hook
 * 
 * 处理截图等核心业务逻辑
 */
export const useMainAppLogic = () => {
  /**
   * 使用原生系统截图（推荐方案）
   * 
   * 使用 macOS 系统的 screencapture 工具，权限更简单，更可靠。
   * 用户在系统界面选择区域后，会弹出预览窗口显示截图和操作工具栏。
   * 
   * @param {Function} setIsCapturing - 设置截图状态的函数
   */
  const handleCaptureScreenNative = useCallback(async (
    setIsCapturing: (capturing: boolean) => void
  ) => {
    setIsCapturing(true);
    try {
      console.log("启动原生截图...");
      const result = await window.electronAPI.captureScreenNative();

      if (result.success) {
        console.log("原生截图成功，预览窗口已打开");
        // 预览窗口会自动打开
      } else if (result.errorCode === "USER_CANCELLED") {
        // 用户取消截图，不显示错误
        console.log("用户取消截图");
      } else {
        console.error("原生截图失败:", result.error);
        alert(`截图失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("原生截图失败:", error);
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
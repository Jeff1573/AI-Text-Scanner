import { useCallback } from "react";

export const useMainAppLogic = () => {
  const handleCaptureScreen = useCallback(async (setIsCapturing: (capturing: boolean) => void) => {
    setIsCapturing(true);
    try {
      const result = await window.electronAPI.captureScreen();

      if (result.success && result.sources && result.sources.length > 0) {
        // 直接使用第一个屏幕的截图创建新窗口
        const firstSource = result.sources[0];
        await window.electronAPI.createScreenshotWindow(firstSource);
      } else {
        console.error("截图失败:", result.error);
        alert(`截图失败: ${result.error}`);
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
  };
}; 
import { useEffect } from "react";
import type { ScreenSource } from "../types/electron";

export const useScreenshotViewerEffects = (
  setScreenshotData: (data: ScreenSource | null) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setShowSelector: (show: boolean) => void,
  loading: boolean
) => {
  useEffect(() => {
    console.log("ScreenshotViewer 组件挂载");
    console.log("当前URL hash:", window.location.hash);

    // 监听截图数据（来自IPC）
    const handleScreenshotData = (data: ScreenSource) => {
      console.log("收到截图数据:", data);
      setScreenshotData(data);
      setLoading(false);
      setError(null);
      // 显示截图后自动显示选择器
      setTimeout(() => setShowSelector(true), 1000);
    };

    // 监听自定义事件（来自全局快捷键）
    const handleCustomScreenshotData = (event: CustomEvent) => {
      console.log("收到自定义事件截图数据:", event.detail);
      setScreenshotData(event.detail);
      setLoading(false);
      setError(null);
      // 显示截图后自动显示选择器
      setTimeout(() => setShowSelector(true), 1000);
    };

    // 注册IPC监听器
    console.log("注册截图数据监听器");
    window.electronAPI.onScreenshotData(handleScreenshotData);

    // 注册自定义事件监听器
    console.log("注册自定义事件监听器");
    window.addEventListener('screenshot-data-received', handleCustomScreenshotData as EventListener);

    // 设置超时，如果10秒内没有收到数据，显示错误
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("数据接收超时");
        setError("数据接收超时，请重试");
        setLoading(false);
      }
    }, 10000);

    // 清理监听器
    return () => {
      console.log("ScreenshotViewer 组件卸载");
      window.electronAPI.removeScreenshotDataListener();
      window.removeEventListener('screenshot-data-received', handleCustomScreenshotData as EventListener);
      clearTimeout(timeout);
    };
  }, [setScreenshotData, setLoading, setError, setShowSelector, loading]);
}; 
import { useEffect } from "react";
import type { ScreenSource } from "../types/electron";

export const useScreenshotViewerEffects = (
  setScreenshotData: (data: ScreenSource | null) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setShowSelector: (show: boolean) => void,
  resetSelection: () => void,
  setShowToolbar: (show: boolean) => void,
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
      resetSelection();
      setShowToolbar(false);
      // 显示截图后立即显示选择器
      setShowSelector(true);
    };

    // 监听自定义事件（来自全局快捷键）
    const handleCustomScreenshotData = (event: CustomEvent) => {
      console.log("收到自定义事件截图数据:", event.detail);
      setScreenshotData(event.detail);
      setLoading(false);
      setError(null);
      resetSelection();
      setShowToolbar(false);
      // 显示截图后立即显示选择器
      setShowSelector(true);
    };

    // 注册IPC监听器
    console.log("注册截图数据监听器");
    window.electronAPI.onScreenshotData(handleScreenshotData);

    // 注册自定义事件监听器
    console.log("注册自定义事件监听器");
    window.addEventListener('screenshot-data-received', handleCustomScreenshotData as EventListener);

    // 监听窗口隐藏事件，清理状态避免残留
    const handleWindowHide = () => {
      console.log("收到窗口隐藏事件，清理渲染进程状态");
      setScreenshotData(null);
      setLoading(false);
      setError(null);
      resetSelection();
      setShowToolbar(false);
      setShowSelector(false);
    };
    console.log("注册截图窗口隐藏监听器");
    window.electronAPI.onScreenshotWindowHide(handleWindowHide);

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
      window.electronAPI.removeScreenshotWindowHideListener();
      window.removeEventListener('screenshot-data-received', handleCustomScreenshotData as EventListener);
      clearTimeout(timeout);
    };
  }, [
    setScreenshotData,
    setLoading,
    setError,
    setShowSelector,
    resetSelection,
    setShowToolbar,
    loading,
  ]);
};

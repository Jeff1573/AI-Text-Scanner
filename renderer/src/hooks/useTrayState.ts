import { useState, useCallback } from 'react';

interface TrayState {
  isTrayAvailable: boolean;
  isMinimizedToTray: boolean;
  isTrayInitialized: boolean;
}

interface TrayActions {
  hideToTray: () => Promise<void>;
  showFromTray: () => Promise<void>;
  checkTrayAvailability: () => Promise<void>;
}

export const useTrayState = (): [TrayState, TrayActions] => {
  const [state, setState] = useState<TrayState>({
    isTrayAvailable: false,
    isMinimizedToTray: false,
    isTrayInitialized: false,
  });

  const checkTrayAvailability = useCallback(async () => {
    try {
      // 检查 window.electronAPI 是否存在
      if (!window.electronAPI) {
        console.warn('window.electronAPI 未定义，托盘功能可能不可用');
        setState(prev => ({
          ...prev,
          isTrayAvailable: false,
          isTrayInitialized: true,
        }));
        return;
      }

      const isAvailable = await window.electronAPI.isTrayAvailable();
      setState(prev => ({
        ...prev,
        isTrayAvailable: isAvailable,
        isTrayInitialized: true,
      }));
    } catch (error) {
      console.error('检查托盘可用性失败:', error);
      setState(prev => ({
        ...prev,
        isTrayAvailable: false,
        isTrayInitialized: true,
      }));
    }
  }, []);

  const hideToTray = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        console.warn('window.electronAPI 未定义，无法隐藏到托盘');
        return;
      }
      await window.electronAPI.hideToTray();
      setState(prev => ({
        ...prev,
        isMinimizedToTray: true,
      }));
    } catch (error) {
      console.error('隐藏到托盘失败:', error);
    }
  }, []);

  const showFromTray = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        console.warn('window.electronAPI 未定义，无法从托盘显示');
        return;
      }
      await window.electronAPI.showFromTray();
      setState(prev => ({
        ...prev,
        isMinimizedToTray: false,
      }));
    } catch (error) {
      console.error('从托盘显示失败:', error);
    }
  }, []);

  const actions: TrayActions = {
    hideToTray,
    showFromTray,
    checkTrayAvailability,
  };

  return [state, actions];
};

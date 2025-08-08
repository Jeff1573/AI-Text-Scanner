import { useCallback } from 'react';
import { useConfigStore } from '../stores/configStore';

export const useAutoLaunch = () => {
  // 从Zustand store直接获取autoLaunch状态和更新函数
  const autoLaunchEnabled = useConfigStore(state => state.config.autoLaunch);
  const setGlobalConfig = useConfigStore(state => state.setConfig);
  const isLoading = useConfigStore(state => state.isLoading);
  const globalConfig = useConfigStore(state => state.config);

  // 设置开机自启动的函数
  const setAutoLaunchEnabled = useCallback(async (enabled: boolean) => {
    // 调用Electron API来实际更改系统设置
    const result = await window.electronAPI.setLoginItemSettings(enabled);
    if (result.success) {
      // 如果系统设置成功，则更新Zustand store中的全局配置
      if (globalConfig) {
        await setGlobalConfig({ ...globalConfig, autoLaunch: enabled });
      }
    } else {
      // 如果失败，可以抛出错误或进行其他错误处理
      throw new Error(result.error || '设置开机自启动失败');
    }
  }, [globalConfig, setGlobalConfig]);

  return {
    enabled: !!autoLaunchEnabled,
    loading: isLoading, // 直接使用store的加载状态
    setEnabled: setAutoLaunchEnabled,
  };
};

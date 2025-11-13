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
    try {
      console.log(`[Frontend] 设置开机自启: ${enabled}`);
      
      // 调用Electron API来实际更改系统设置
      const result = await window.electronAPI.setLoginItemSettings(enabled);
      console.log(`[Frontend] 设置结果:`, result);
      
      if (result.success && result.verified) {
        // 系统设置成功且已验证，更新本地配置
        if (globalConfig) {
          await setGlobalConfig({ ...globalConfig, autoLaunch: enabled });
        }
        console.log(`[Frontend] 开机自启设置成功: ${enabled}, 策略: ${result.strategy}`);
      } else if (result.success && !result.verified) {
        // 设置调用成功但验证失败
        const errorMsg = `设置开机自启失败：系统状态验证不通过 (期望: ${enabled}, 实际: ${result.openAtLogin})`;
        console.error(`[Frontend] ${errorMsg}`);
        throw new Error(errorMsg);
      } else {
        // 设置失败
        const errorMsg = result.error || '设置开机自启动失败';
        console.error(`[Frontend] 设置失败:`, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error(`[Frontend] 开机自启设置异常:`, error);
      throw error;
    }
  }, [globalConfig, setGlobalConfig]);

  return {
    enabled: !!autoLaunchEnabled,
    loading: isLoading, // 直接使用store的加载状态
    setEnabled: setAutoLaunchEnabled,
  };
};

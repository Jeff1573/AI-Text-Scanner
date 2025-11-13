import { create } from 'zustand';
import type { SettingsFormData } from '../types/settings';

// 定义 Store 的 state 结构
interface ConfigState {
  config: SettingsFormData;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
}

// 定义 Store 的 actions
interface ConfigActions {
  fetchConfig: (force?: boolean) => Promise<void>;
  setConfig: (newConfig: Partial<SettingsFormData>) => void;
  saveConfig: () => Promise<boolean>;
  resetConfig: () => void;
}

// 合并 state 和 actions 类型
type ConfigStore = ConfigState & ConfigActions;

const defaultConfig: SettingsFormData = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  customModel: '',
  sourceLang: 'auto',
  targetLang: 'zh',
  resultHotkey: 'CommandOrControl+Shift+T',
  screenshotHotkey: 'CommandOrControl+Shift+S',
  autoLaunch: false,
};

// 创建 Zustand store
export const useConfigStore = create<ConfigStore>((set, get) => ({
  // 初始状态
  config: { ...defaultConfig },
  isLoading: true,
  error: null,
  isSaving: false,

  // Action: 从主进程异步获取配置
  fetchConfig: async (force = false) => {
    console.log("fetchConfig", force);
    // 防止重复获取，除非强制刷新
    if (!force && !get().isLoading && get().config.apiKey) return;

    set({ isLoading: true, error: null });
    try {
      console.log('[ConfigStore] 开始获取配置...');
      
      // 检查 window.electronAPI 是否可用
      if (!window.electronAPI) {
        console.warn('[ConfigStore] window.electronAPI 未定义，使用默认配置');
        set({ config: { ...defaultConfig }, isLoading: false, error: 'Electron API 不可用' });
        return;
      }
      
      const result = await window.electronAPI.getLatestConfig(true);
      console.log('[ConfigStore] 获取配置结果:', result);
      
      if (result.success && result.config) {
        // 确保配置包含所有必需字段
        const configWithDefaults = { ...defaultConfig, ...result.config };
        console.log('[ConfigStore] 设置配置:', configWithDefaults);
        set({ config: configWithDefaults as SettingsFormData, isLoading: false });
      } else {
        // 如果失败，也使用默认值，并标记加载完成
        console.warn('[ConfigStore] 配置获取失败，使用默认配置:', result.error);
        set({ config: { ...defaultConfig }, isLoading: false, error: result.error || '未能加载配置' });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[ConfigStore] 获取配置异常:', error);
      set({ error, isLoading: false, config: { ...defaultConfig } });
    }
  },

  // Action: 更新 store 中的配置的某个字段
  setConfig: (newConfig) => {
    set((state) => ({
      config: { ...state.config, ...newConfig },
    }));
  },

  // Action: 保存当前 store 中的配置到主进程
  saveConfig: async () => {
    set({ isSaving: true });
    try {
      const currentConfig = get().config;
      console.log('[ConfigStore] 开始保存配置:', currentConfig);
      
      // 检查 window.electronAPI 是否可用
      if (!window.electronAPI) {
        console.warn('[ConfigStore] window.electronAPI 未定义，无法保存配置');
        return false;
      }
      
      const result = await window.electronAPI.saveConfig(currentConfig);
      console.log('[ConfigStore] 保存结果:', result);
      
      if (result.success) {
        // 保存成功后，强制重新获取最新配置以确保同步
        console.log('[ConfigStore] 配置保存成功，重新获取最新配置');
        await get().fetchConfig(true);
        return true;
      } else {
        console.error('[ConfigStore] 配置保存失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[ConfigStore] 保存配置异常:', error);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  // Action: 重置配置为默认值
  resetConfig: () => {
    set({ config: { ...defaultConfig } });
  },
}));

// 在应用启动时自动获取一次配置
useConfigStore.getState().fetchConfig();

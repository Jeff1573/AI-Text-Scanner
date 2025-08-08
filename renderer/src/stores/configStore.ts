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
  fetchConfig: () => Promise<void>;
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
  fetchConfig: async () => {
    // 防止重复获取
    if (!get().isLoading && get().config.apiKey) return;

    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.getLatestConfig(true);
      if (result.success && result.config) {
        set({ config: result.config as SettingsFormData, isLoading: false });
      } else {
        // 如果失败，也使用默认值，并标记加载完成
        set({ config: { ...defaultConfig }, isLoading: false, error: result.error || '未能加载配置' });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, isLoading: false, config: { ...defaultConfig } });
      console.error('获取配置失败:', error);
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
      const result = await window.electronAPI.saveConfig(currentConfig);
      if (result.success) {
        return true;
      }
      return false;
    } catch (error) {
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

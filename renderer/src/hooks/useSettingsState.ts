import { useState, useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';
import type { SettingsFormData } from '../types/settings';

// 如果没有从store加载到配置，则使用此默认值
const defaultFormData: SettingsFormData = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  customModel: '',
  sourceLang: 'en',
  targetLang: 'zh',
  resultHotkey: 'CommandOrControl+Shift+T',
  screenshotHotkey: 'CommandOrControl+Shift+S',
  autoLaunch: false,
};

export const useSettingsState = () => {
  // 1. 从Zustand store中获取全局状态和action
  const {
    config: globalConfig,
    isLoading: isConfigLoading,
    error: configError,
    setConfig: setGlobalConfig,
    fetchConfig,
  } = useConfigStore();

  // 2. 为表单编辑会话管理本地状态
  const [formData, setFormData] = useState<SettingsFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<SettingsFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 3. 当全局配置加载或更改时，同步到本地表单状态
  useEffect(() => {
    if (globalConfig) {
      setFormData(globalConfig);
    }
  }, [globalConfig]);

  // 4. 管理本地表单状态的函数
  const updateFormData = (field: keyof SettingsFormData, value: SettingsFormData[typeof field]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const resetFormData = () => {
    // 将本地表单重置为上次保存的全局配置
    if (globalConfig) {
      setFormData(globalConfig);
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
  };

  const setFieldError = (field: keyof SettingsFormData, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearErrors = () => {
    setErrors({});
  };

  // 5. 返回本地状态处理函数和全局状态/action
  return {
    formData,
    errors,
    isSaving,
    isValidating,
    isLoading: isConfigLoading, // 使用全局的加载状态
    configError, // 传递全局的错误状态
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving,
    setIsValidating,
    setGlobalConfig, // 将全局的setter传递给逻辑hook
    fetchConfig, // 暴露fetch函数以供重载
  };
};

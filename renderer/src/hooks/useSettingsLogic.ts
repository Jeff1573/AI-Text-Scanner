import { useSettingsState } from './useSettingsState';
import type { SettingsFormData } from '../types/settings';

export const useSettingsLogic = () => {
  const {
    formData,
    errors,
    isSaving,
    isLoading,
    configError,
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving,
    setGlobalConfig,
    fetchConfig,
  } = useSettingsState();

  // URL验证函数
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SettingsFormData, string>> = {};

    if (!formData.apiUrl?.trim()) {
      newErrors.apiUrl = 'API地址不能为空';
    } else if (!isValidUrl(formData.apiUrl)) {
      newErrors.apiUrl = '请输入有效的API地址';
    }

    if (!formData.model) {
      newErrors.model = '请选择模型';
    }

    if (formData.model === 'custom' && !formData.customModel?.trim()) {
      newErrors.customModel = '请输入自定义模型名称';
    }

    const isValidAccelerator = (acc: string): boolean => {
      if (!acc) return false;
      const part = '(CommandOrControl|Command|Control|Ctrl|Cmd|Alt|Option|Shift|Super|Win|Meta|F([1-9]|1[0-9]|2[0-4])|[A-Z0-9]|Space|Tab|Backspace|Delete|Insert|Return|Enter|Escape|Esc|Up|Down|Left|Right|Home|End|PageUp|PageDown)';
      const re = new RegExp(`^${part}(\\+${part})*$`, 'i');
      return re.test(acc.trim());
    };

    if (!formData.resultHotkey || !isValidAccelerator(formData.resultHotkey)) {
      newErrors.resultHotkey = '请输入有效快捷键，如 CommandOrControl+Shift+T';
    }
    if (!formData.screenshotHotkey || !isValidAccelerator(formData.screenshotHotkey)) {
      newErrors.screenshotHotkey = '请输入有效快捷键，如 CommandOrControl+Shift+S';
    }

    if (
      formData.resultHotkey && formData.screenshotHotkey &&
      formData.resultHotkey.trim().toLowerCase() ===
      formData.screenshotHotkey.trim().toLowerCase()
    ) {
      newErrors.screenshotHotkey = '两个快捷键不能相同';
    }
    
    clearErrors();
    if (Object.keys(newErrors).length > 0) {
        Object.entries(newErrors).forEach(([key, value]) => {
            setFieldError(key as keyof SettingsFormData, value as string);
        });
        return false;
    }

    return true;
  };

  // 验证API配置
  const validateApiConfig = async (): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    try {
      // API验证直接使用主进程的最新配置，无需通过Zustand
      // 注意：这会验证已保存的配置，而不是当前表单中的未保存内容
      const result = await window.electronAPI.validateOpenAIConfig();
      if (!result.success) {
        setFieldError('apiKey', `API配置验证失败: ${result.error || '未知错误'}`);
        return false;
      }
      return true;
    } catch (error) {
      setFieldError('apiKey', 'API配置验证失败，请检查网络连接');
      return false;
    }
  };

  // 保存设置
  const handleSaveSettings = async (): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }
    
    setIsSaving(true);
    try {
      await setGlobalConfig(formData);
      return true;
    } catch (error) {
      setFieldError('apiUrl', '保存失败，请重试');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 重置设置
  const handleResetSettings = () => {
    resetFormData();
  };

  // 处理输入变化
  const handleInputChange = (field: keyof SettingsFormData, value: string | boolean) => {
    updateFormData(field, value);
  };

  return {
    formData,
    errors,
    isSaving,
    isLoading,
    configError,
    handleInputChange,
    handleSaveSettings,
    handleResetSettings,
    validateApiConfig,
    fetchConfig,
  };
};

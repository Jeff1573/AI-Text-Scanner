import { useSettingsState } from './useSettingsState';
import type { SettingsFormData } from '../types/settings';

export const useSettingsLogic = () => {
  const {
    formData,
    errors,
    isSaving,
    isValidating,
    isLoading,
    configError,
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving,
    setIsValidating,
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

    setIsValidating(true);
    clearErrors();

    try {
      // 首先保存当前配置以便验证
      await setGlobalConfig(formData);
      
      // API验证直接使用主进程的最新配置
      const result = await window.electronAPI.validateOpenAIConfig();
      
      if (!result.success) {
        const errorMessage = getDetailedErrorMessage(result.error);
        setFieldError('apiKey', errorMessage);
        return false;
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setFieldError('apiKey', `验证失败: ${errorMessage}`);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // 获取详细的错误信息
  const getDetailedErrorMessage = (error: string | undefined): string => {
    if (!error) return '验证失败，请检查配置';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('unauthorized') || errorLower.includes('401')) {
      return 'API密钥无效，请检查密钥是否正确';
    }
    if (errorLower.includes('forbidden') || errorLower.includes('403')) {
      return 'API密钥权限不足，请检查密钥权限';
    }
    if (errorLower.includes('not found') || errorLower.includes('404')) {
      return 'API地址或模型不存在，请检查配置';
    }
    if (errorLower.includes('timeout') || errorLower.includes('network')) {
      return '网络连接超时，请检查网络连接和API地址';
    }
    if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      return 'API调用频率超限，请稍后再试';
    }
    if (errorLower.includes('quota') || errorLower.includes('billing')) {
      return 'API配额不足，请检查账户余额';
    }
    
    return `验证失败: ${error}`;
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
    isValidating,
    isLoading,
    configError,
    handleInputChange,
    handleSaveSettings,
    handleResetSettings,
    validateApiConfig,
    fetchConfig,
  };
};

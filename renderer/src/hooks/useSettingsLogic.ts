import { useSettingsState } from './useSettingsState';
import type { SettingsFormData } from '../types/settings';

export const useSettingsLogic = () => {
  const {
    formData,
    errors,
    isSaving,
    isLoading,
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving
  } = useSettingsState();

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<SettingsFormData> = {};

    // 验证API地址
    if (!formData.apiUrl.trim()) {
      newErrors.apiUrl = 'API地址不能为空';
    } else if (!isValidUrl(formData.apiUrl)) {
      newErrors.apiUrl = '请输入有效的API地址';
    }

    // 验证API密钥
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API密钥不能为空';
    }

    // 验证模型选择
    if (!formData.model) {
      newErrors.model = '请选择模型';
    }

    // 验证自定义模型
    if (formData.model === 'custom' && !formData.customModel.trim()) {
      newErrors.customModel = '请输入自定义模型名称';
    }

    // 设置错误信息
    Object.keys(newErrors).forEach(key => {
      const fieldKey = key as keyof SettingsFormData;
      const errorValue = newErrors[fieldKey];
      if (errorValue) {
        setFieldError(fieldKey, errorValue);
      }
    });

    return Object.keys(newErrors).length === 0;
  };

  // URL验证函数
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    clearErrors();

    try {
      // 调用Electron API保存配置到config.json
      const result = await window.electronAPI.saveConfig(formData);
      
      if (result.success) {
        console.log('配置保存成功');
        // 可以在这里添加成功提示
      } else {
        console.error('保存配置失败:', result.error);
        setFieldError('apiUrl', `保存失败: ${result.error}`);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      setFieldError('apiUrl', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 重置设置
  const handleResetSettings = () => {
    resetFormData();
    clearErrors();
    console.log('设置已重置');
  };

  // 处理输入变化
  const handleInputChange = (field: keyof SettingsFormData, value: string) => {
    updateFormData(field, value);
  };

  return {
    formData,
    errors,
    isSaving,
    isLoading,
    handleInputChange,
    handleSaveSettings,
    handleResetSettings,
    validateForm
  };
}; 
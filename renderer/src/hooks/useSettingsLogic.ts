import { useSettingsState } from './useSettingsState';
import type { SettingsFormData } from '../types/settings';
import type { APIConfig } from '../types/electron';

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

  // 验证API配置
  const validateApiConfig = async (): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    try {
      const apiConfig: APIConfig = {
        apiKey: formData.apiKey,
        apiUrl: formData.apiUrl,
        model: formData.customModel || formData.model
      };

      const result = await window.electronAPI.validateOpenAIConfig(apiConfig);
      console.log('validateOpenAIConfig result:', result);
      if (!result.success) {
        setFieldError('apiKey', `API配置验证失败: ${result.error || '未知错误'}`);
        return false;
      }

      // 提示成功
      alert('✅ API配置验证成功！您的OpenAI API配置已正确设置。');
      console.log('API配置验证成功');
      
      return true;
    } catch (error) {
      console.error('API配置验证失败:', error);
      setFieldError('apiKey', 'API配置验证失败，请检查网络连接');
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
      // 先验证API配置
      const isValid = await validateApiConfig();
      if (!isValid) {
        setIsSaving(false);
        return;
      }

      // 调用Electron API保存配置到config.json
      const result = await window.electronAPI.saveConfig(formData);
      
      if (result.success) {
        console.log('配置保存成功');
        // 提示成功
        alert('✅ 配置保存成功！您的设置已成功保存。');
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
    // 提示重置成功
    alert('🔄 设置已重置为默认值！');
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
    validateForm,
    validateApiConfig
  };
}; 
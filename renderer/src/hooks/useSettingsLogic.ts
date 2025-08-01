import { useSettingsState, SettingsFormData } from './useSettingsState';

export const useSettingsLogic = () => {
  const {
    formData,
    errors,
    isSaving,
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

    // 设置错误信息
    Object.keys(newErrors).forEach(key => {
      setFieldError(key as keyof SettingsFormData, newErrors[key as keyof SettingsFormData]!);
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
      // 这里可以添加实际的保存逻辑
      // 例如调用Electron的IPC接口保存到本地存储
      console.log('保存设置:', formData);
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 保存成功后的处理
      console.log('设置保存成功');
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
    handleInputChange,
    handleSaveSettings,
    handleResetSettings,
    validateForm
  };
}; 
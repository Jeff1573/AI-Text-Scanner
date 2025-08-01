import { useState } from 'react';

export interface SettingsFormData {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
}

export const useSettingsState = () => {
  // 表单数据状态
  const [formData, setFormData] = useState<SettingsFormData>({
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    customModel: ''
  });

  // 表单验证状态
  const [errors, setErrors] = useState<Partial<SettingsFormData>>({});

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // 更新表单数据
  const updateFormData = (field: keyof SettingsFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // 重置表单数据
  const resetFormData = () => {
    setFormData({
      apiUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      customModel: ''
    });
    setErrors({});
  };

  // 设置错误信息
  const setFieldError = (field: keyof SettingsFormData, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // 清除所有错误
  const clearErrors = () => {
    setErrors({});
  };

  return {
    formData,
    errors,
    isSaving,
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving
  };
}; 
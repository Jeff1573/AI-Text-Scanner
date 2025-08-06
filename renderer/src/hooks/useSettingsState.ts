import { useState, useEffect } from 'react';
import type { SettingsFormData } from '../types/settings';

const defaultFormData = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  customModel: '',
  sourceLang: 'en',
  targetLang: 'zh'
}

export const useSettingsState = () => {
  // 表单数据状态
  const [formData, setFormData] = useState<SettingsFormData>(defaultFormData);

  // 表单验证状态
  const [errors, setErrors] = useState<Partial<SettingsFormData>>({});

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);

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
      customModel: '',
      sourceLang: 'en',
      targetLang: 'zh'
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

  // 加载配置
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.loadConfig();
      if (result.success && result.config) {
        setFormData({...defaultFormData, ...result.config});
        console.log('配置加载成功:', result.config);
      } else {
        console.log('使用默认配置');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  return {
    formData,
    errors,
    isSaving,
    isLoading,
    updateFormData,
    resetFormData,
    setFieldError,
    clearErrors,
    setIsSaving,
    loadConfig
  };
}; 
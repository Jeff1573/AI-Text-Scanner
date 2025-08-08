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

    // API 密钥允许为空（允许仅保存快捷键/其他设置）。如需验证，请使用“验证配置”按钮

    // 验证模型选择
    if (!formData.model) {
      newErrors.model = '请选择模型';
    }

    // 验证自定义模型
    if (formData.model === 'custom' && !formData.customModel.trim()) {
      newErrors.customModel = '请输入自定义模型名称';
    }

    // 验证快捷键（基本格式检查）
    const isValidAccelerator = (acc: string): boolean => {
      // 允许字母/数字/F1-F24/方向键/常用按键，支持 + 连接
      const part = '(CommandOrControl|Command|Control|Ctrl|Cmd|Alt|Option|Shift|Super|Win|Meta|F([1-9]|1[0-9]|2[0-4])|[A-Z]|[0-9]|Space|Tab|Backspace|Delete|Insert|Return|Enter|Escape|Esc|Up|Down|Left|Right|Home|End|PageUp|PageDown)';
      // 修复：去除正则中的不必要转义符
      const re = new RegExp(`^${part}(\\+${part})*$`, 'i');
      return re.test(acc.trim());
    };
    if (!isValidAccelerator(formData.resultHotkey)) {
      newErrors.resultHotkey = '请输入有效快捷键，如 CommandOrControl+Shift+T';
    }
    if (!isValidAccelerator(formData.screenshotHotkey)) {
      newErrors.screenshotHotkey = '请输入有效快捷键，如 CommandOrControl+Shift+S';
    }
    // 冲突检测：两者不能完全相同
    if (
      formData.resultHotkey.trim().toLowerCase() ===
      formData.screenshotHotkey.trim().toLowerCase()
    ) {
      newErrors.screenshotHotkey = '两个快捷键不能相同';
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
      const result = await window.electronAPI.validateOpenAIConfig();
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
  const handleSaveSettings = async (): Promise<boolean> => {
    
    if (!validateForm()) {
      return false;
    }
    console.log("2333")

    setIsSaving(true);
    clearErrors();

    try {
      // 调用Electron API保存配置到config.json
      console.log('formData', formData)
      const result = await window.electronAPI.saveConfig(formData);
      
      if (result.success) {
        console.log('配置保存成功');
        // 提示成功
        alert('✅ 配置保存成功！您的设置已成功保存。');
        return true;
      } else {
        console.error('保存配置失败:', result.error);
        setFieldError('apiUrl', `保存失败: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      setFieldError('apiUrl', '保存失败，请重试');
      return false;
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
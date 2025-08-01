import { useSettingsLogic } from '../hooks/useSettingsLogic';

export const SettingsPage = () => {
  const {
    formData,
    errors,
    isSaving,
    isLoading,
    handleInputChange,
    handleSaveSettings,
    handleResetSettings
  } = useSettingsLogic();

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="page" id="settings-page">
        <div className="page-header">
          <h1>设置</h1>
          <p>配置OpenAI API参数</p>
        </div>
        
        <div className="content-area">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在加载配置...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="settings-page">
      <div className="page-header">
        <h1>设置</h1>
        <p>配置OpenAI API参数</p>
      </div>
      
      <div className="content-area">
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">API地址</label>
            <input
              type="text"
              className={`form-input ${errors.apiUrl ? 'error' : ''}`}
              placeholder="https://api.openai.com/v1"
              value={formData.apiUrl}
              onChange={(e) => handleInputChange('apiUrl', e.target.value)}
            />
            {errors.apiUrl && (
              <div className="error-message">{errors.apiUrl}</div>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">API密钥</label>
            <input
              type="password"
              className={`form-input ${errors.apiKey ? 'error' : ''}`}
              placeholder="输入您的OpenAI API密钥"
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
            />
            {errors.apiKey && (
              <div className="error-message">{errors.apiKey}</div>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">模型选择</label>
            <select
              className={`form-select ${errors.model ? 'error' : ''}`}
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="custom">自定义模型</option>
            </select>
            {errors.model && (
              <div className="error-message">{errors.model}</div>
            )}
          </div>
          
          {formData.model === 'custom' && (
            <div className="form-group">
              <label className="form-label">自定义模型名称</label>
              <input
                type="text"
                className={`form-input ${errors.customModel ? 'error' : ''}`}
                placeholder="输入自定义模型名称，如：gpt-4-custom"
                value={formData.customModel}
                onChange={(e) => handleInputChange('customModel', e.target.value)}
              />
              {errors.customModel && (
                <div className="error-message">{errors.customModel}</div>
              )}
            </div>
          )}
          
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleResetSettings}
              disabled={isSaving}
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
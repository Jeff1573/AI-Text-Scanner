import { useSettingsLogic } from "../hooks/useSettingsLogic";
import {
  Collapse,
  Form,
  Input,
  Select,
  Button,
  message,
  Switch,
  Spin,
  Alert,
  Card,
  Space,
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { CollapseProps } from "antd";
import { ConfigDisplay } from "../components/ConfigDisplay";

export const SettingsPage = () => {
  const {
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
  } = useSettingsLogic();

  // 使用 Hook 方式获取 message API
  const [messageApi, contextHolder] = message.useMessage();

  // 当全局配置仍在加载时，显示加载指示器
  if (isLoading) {
    return (
      <div className="page" id="settings-page">
        <div className="content-area" style={{ textAlign: 'center', paddingTop: 100 }}>
          <Spin size="large" tip="正在加载配置..." />
        </div>
      </div>
    );
  }

  // 如果加载配置时发生错误，显示错误信息
  if (configError) {
    return (
        <div className="page" id="settings-page">
            <div className="content-area" style={{ padding: 50 }}>
                <Alert message={`加载配置失败: ${configError}`} type="error" showIcon />
            </div>
        </div>
    );
  }

  const handleSave = async () => {
    const hideLoading = messageApi.loading('正在保存设置...', 0);
    
    try {
      const ok = await handleSaveSettings();
      hideLoading();
      
      if (ok) {
        messageApi.success({
          content: "设置保存成功！配置已生效。",
          duration: 3,
        });
      } else {
        messageApi.error({
          content: "保存失败，请检查表单中的错误信息并修正。",
          duration: 4,
        });
      }
    } catch (error) {
      hideLoading();
      messageApi.error({
        content: "保存过程中发生错误，请稍后重试。",
        duration: 3,
      });
    }
  };

  const handleValidate = async () => {
    // 显示验证开始的提示
    const hideLoading = messageApi.loading('正在验证API配置...', 0);
    
    try {
      const ok = await validateApiConfig();
      hideLoading();
      
      if (ok) {
        messageApi.success({
          content: "API配置验证成功！连接正常，可以正常使用。",
          duration: 3,
        });
      } else {
        // 错误信息已经在表单字段中显示，这里只显示简单提示
        messageApi.error({
          content: "API配置验证失败，请查看详细错误信息并修正配置。",
          duration: 4,
        });
      }
    } catch (error) {
      hideLoading();
      messageApi.error({
        content: "验证过程中发生错误，请稍后重试。",
        duration: 3,
      });
    }
  };

  const handleReset = () => {
    handleResetSettings();
    messageApi.info("设置已重置为上次保存的状态");
  };

  // 键盘事件处理，用于快捷键输入
  const handleHotkeyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "resultHotkey" | "screenshotHotkey"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    const key = e.key.toUpperCase();
    const isModifier = ["SHIFT", "CONTROL", "ALT", "META"].includes(key);
    if (isModifier) return;
    
    parts.push(key);
    const accelerator = parts.join("+");
    
    if (accelerator) {
      handleInputChange(field, accelerator);
    }
  };

  const items: CollapseProps["items"] = [
    {
      key: "1",
      label: "OpenAI API 配置",
      children: (
        <Form layout="vertical" style={{ padding: "16px 0" }}>
          {/* 表单项与之前类似，但value和onChange直接来自重构后的hook */}
          <Form.Item
            label="API地址"
            validateStatus={errors.apiUrl ? "error" : ""}
            help={errors.apiUrl}
            extra={
              <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                {(() => { const b = (((formData.apiUrl || '').trim() || 'https://api.openai.com').replace(/\/+$/, '')); const suffix = /\/v1$/i.test(b) ? '/chat/completions' : '/v1/chat/completions'; return `${b}${suffix}`; })()}
                <span style={{ marginLeft: 8, color: '#bbb' }}>(其中 v1 可选，可省略)</span>
              </div>
            }
          >
            <Input
              value={formData.apiUrl}
              onChange={(e) => handleInputChange("apiUrl", e.target.value)}
              size="large"
            />
          </Form.Item>
          <Form.Item label="API密钥" validateStatus={errors.apiKey ? "error" : ""} help={errors.apiKey}>
            <Input.Password
              value={formData.apiKey}
              onChange={(e) => handleInputChange("apiKey", e.target.value)}
              size="large"
            />
          </Form.Item>
          <Form.Item label="模型选择" validateStatus={errors.model ? "error" : ""} help={errors.model}>
            <Select
              value={formData.model}
              onChange={(value) => handleInputChange("model", value)}
              size="large"
            >
              <Select.Option value="gpt-4o">GPT-4o</Select.Option>
              <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
              <Select.Option value="custom">自定义模型</Select.Option>
            </Select>
          </Form.Item>
          {formData.model === "custom" && (
            <Form.Item 
              label="自定义模型名称" 
              validateStatus={errors.customModel ? "error" : ""} 
              help={errors.customModel}
            >
              <Input
                value={formData.customModel}
                onChange={(e) => handleInputChange("customModel", e.target.value)}
                placeholder="请输入模型名称，如 gpt-3.5-turbo"
                size="large"
              />
            </Form.Item>
          )}
          
          {/* 验证状态提示 */}
          {isValidating && (
            <Card size="small" style={{ marginTop: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Space>
                <LoadingOutlined style={{ color: '#52c41a' }} />
                <span style={{ color: '#389e0d' }}>正在验证API配置，请稍候...</span>
              </Space>
            </Card>
          )}
          
          {/* 错误提示增强 */}
          {errors.apiKey && (
            <Card size="small" style={{ marginTop: 16, backgroundColor: '#fff2f0', border: '1px solid #ffccc7' }}>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <div>
                  <div style={{ color: '#cf1322', fontWeight: 500 }}>验证失败</div>
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                    {errors.apiKey}
                  </div>
                </div>
              </Space>
            </Card>
          )}
        </Form>
      ),
    },
    {
      key: "3",
      label: "快捷键设置",
      children: (
        <Form layout="vertical" style={{ padding: '16px 0' }}>
          <Form.Item label="打开结果窗口快捷键" validateStatus={errors.resultHotkey ? 'error' : ''} help={errors.resultHotkey}>
            <Input
              value={formData.resultHotkey}
              onKeyDown={(e) => handleHotkeyKeyDown(e, 'resultHotkey')}
              size="large"
              readOnly
            />
          </Form.Item>
          <Form.Item label="截图识别快捷键" validateStatus={errors.screenshotHotkey ? 'error' : ''} help={errors.screenshotHotkey}>
            <Input
              value={formData.screenshotHotkey}
              onKeyDown={(e) => handleHotkeyKeyDown(e, 'screenshotHotkey')}
              size="large"
              readOnly
            />
          </Form.Item>
        </Form>
      )
    },
    {
        key: '4',
        label: '启动与系统',
        children: (
          <Form layout="vertical" style={{ padding: '16px 0' }}>
            <Form.Item label="开机自启动">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Switch
                  checked={formData.autoLaunch}
                  loading={isSaving}
                  onChange={(checked) => handleInputChange('autoLaunch', checked)}
                />
                <span style={{ color: '#888' }}>在系统登录时自动启动应用。</span>
              </div>
            </Form.Item>
          </Form>
        )
      }
  ];

  return (
    <div className="page" id="settings-page">
      {/* Message contextHolder 必须放在组件树中 */}
      {contextHolder}
      
      <div className="page-header">
        <h1>设置</h1>
      </div>

      <div className="content-area">
        <Collapse items={items} defaultActiveKey={["1", "3", "4"]} />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: 32 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            size="large"
          >
            保存设置
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={handleValidate}
            loading={isValidating}
            disabled={isSaving || isValidating}
            size="large"
          >
            {isValidating ? '验证中...' : '验证配置'}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={isSaving}
            size="large"
          >
            重置
          </Button>
        </div>
        
        <div style={{ marginTop: 32 }}>
          <ConfigDisplay />
        </div>
      </div>
    </div>
  );
};

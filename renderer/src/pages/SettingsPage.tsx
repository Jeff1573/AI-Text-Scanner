import { useSettingsLogic } from "../hooks/useSettingsLogic";
import { Collapse, Form, Input, Select, Button, message } from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { CollapseProps } from "antd";

export const SettingsPage = () => {
  // use memo
  const {
    formData,
    errors,
    isSaving,
    isLoading,
    handleInputChange,
    handleSaveSettings,
    handleResetSettings,
    validateApiConfig,
  } = useSettingsLogic();

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="page" id="settings-page">
        <div className="page-header">
          <h1>设置</h1>
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

  const handleSave = async () => {
    try {
      await handleSaveSettings();
      message.success("设置保存成功！");
    } catch (error) {
      message.error("保存失败，请检查配置");
    }
  };

  const handleValidate = async () => {
    try {
      await validateApiConfig();
      message.success("API配置验证成功！");
    } catch (error) {
      message.error("API配置验证失败，请检查参数");
    }
  };

  const handleReset = () => {
    handleResetSettings();
    message.info("设置已重置");
  };

  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: 'OpenAI API 配置',
      children: (
        <Form layout="vertical" style={{ padding: "16px 0" }}>
          <Form.Item
            label="API地址"
            validateStatus={errors.apiUrl ? "error" : ""}
            help={errors.apiUrl}
          >
            <Input
              placeholder="https://api.openai.com/v1"
              value={formData.apiUrl}
              onChange={(e) => handleInputChange("apiUrl", e.target.value)}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="API密钥"
            validateStatus={errors.apiKey ? "error" : ""}
            help={errors.apiKey}
          >
            <Input.Password
              placeholder="输入您的OpenAI API密钥"
              value={formData.apiKey}
              onChange={(e) => handleInputChange("apiKey", e.target.value)}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="模型选择"
            validateStatus={errors.model ? "error" : ""}
            help={errors.model}
          >
            <Select
              value={formData.model}
              onChange={(value) => handleInputChange("model", value)}
              size="large"
              placeholder="选择AI模型"
            >
              <Select.Option value="gpt-4o">GPT-4o</Select.Option>
              <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
              <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
              <Select.Option value="gpt-3.5-turbo">
                GPT-3.5 Turbo
              </Select.Option>
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
                placeholder="输入自定义模型名称，如：gpt-4-custom"
                value={formData.customModel}
                onChange={(e) =>
                  handleInputChange("customModel", e.target.value)
                }
                size="large"
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={isSaving}
                size="large"
                className="save-settings-btn"
              >
                保存设置
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleValidate}
                disabled={isSaving}
                size="large"
              >
                验证配置
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
          </Form.Item>
        </Form>
      )
    },
    {
      key: '2',
      label: '翻译设置',
      children: <p>翻译</p>,
    },
  ];

  return (
    <div className="page" id="settings-page">
      <div className="page-header">
        <h1>设置</h1>
      </div>

      <div className="content-area">
        <Collapse items={items} defaultActiveKey={["1"]} />
      </div>
    </div>
  );
};

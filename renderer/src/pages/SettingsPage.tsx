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
      const ok = await handleSaveSettings();
      if (ok) {
        message.success("设置保存成功！");
      } else {
        message.error("保存失败，请检查表单项或控制台日志");
      }
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

  // 将键盘事件转换为 Electron Accelerator 字符串
  const toAccelerator = (e: React.KeyboardEvent<HTMLInputElement>): string | null => {
    const parts: string[] = [];
    const isMac = navigator.platform.toLowerCase().includes('mac');
    if (e.ctrlKey || e.metaKey) {
      parts.push('CommandOrControl');
    }
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    // Super/Win 键
    if ((!isMac && e.getModifierState && e.getModifierState('OS')) || (isMac && e.metaKey && !e.ctrlKey)) {
      // 已用 CommandOrControl 表示 ctrl/cmd，这里仅在 Windows 上尝试 Super
      if (!parts.includes('CommandOrControl')) parts.push('Super');
    }

    const key = e.key;
    // 忽略仅按修饰键的情况
    const isOnlyModifier = ['Shift', 'Control', 'Alt', 'Meta'].includes(key);
    if (isOnlyModifier) return null;

    // 归一化主键
    let mainKey = '';
    if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(key)) {
      mainKey = key.toUpperCase();
    } else if (/^[a-z]$/i.test(key)) {
      mainKey = key.toUpperCase();
    } else if (/^[0-9]$/.test(key)) {
      mainKey = key;
    } else {
      const map: Record<string, string> = {
        ' ': 'Space',
        Spacebar: 'Space',
        Tab: 'Tab',
        Backspace: 'Backspace',
        Delete: 'Delete',
        Insert: 'Insert',
        Enter: 'Return',
        Return: 'Return',
        Escape: 'Escape',
        Esc: 'Escape',
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        Home: 'Home',
        End: 'End',
        PageUp: 'PageUp',
        PageDown: 'PageDown',
      };
      if (map[key]) {
        mainKey = map[key];
      } else {
        // 其它不常见按键不处理
        return null;
      }
    }
    parts.push(mainKey);
    return parts.join('+');
  };

  const handleHotkeyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'resultHotkey' | 'screenshotHotkey'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const acc = toAccelerator(e);
    if (acc) {
      handleInputChange(field, acc);
    }
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
        </Form>
      )
    },
    {
      key: '2',
      label: '翻译设置',
      children: (
        <Form layout="vertical" style={{ padding: "16px 0" }}>
          <Form.Item label="原文语言">
            <Select
              value={formData.sourceLang}
              onChange={value => handleInputChange('sourceLang', value)}
              size="large"
              defaultValue="en"
            >
              <Select.Option value="en">英文</Select.Option>
              <Select.Option value="auto">自动识别</Select.Option>
              <Select.Option value="zh">中文</Select.Option>
              <Select.Option value="ja">日语</Select.Option>
              <Select.Option value="ko">韩语</Select.Option>
              <Select.Option value="fr">法语</Select.Option>
              <Select.Option value="de">德语</Select.Option>
              <Select.Option value="ru">俄语</Select.Option>
              <Select.Option value="es">西班牙语</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="翻译语言">
            <Select
              value={formData.targetLang}
              onChange={value => handleInputChange('targetLang', value)}
              size="large"
              defaultValue="zh"
            >
              <Select.Option value="zh">中文</Select.Option>
              <Select.Option value="en">英文</Select.Option>
              <Select.Option value="ja">日语</Select.Option>
              <Select.Option value="ko">韩语</Select.Option>
              <Select.Option value="fr">法语</Select.Option>
              <Select.Option value="de">德语</Select.Option>
              <Select.Option value="ru">俄语</Select.Option>
              <Select.Option value="es">西班牙语</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: '3',
      label: '快捷键设置',
      children: (
        <Form layout="vertical" style={{ padding: '16px 0' }}>
          <Form.Item label="打开结果窗口快捷键" validateStatus={errors.resultHotkey ? 'error' : ''} help={errors.resultHotkey}>
            <Input
              placeholder="例如：CommandOrControl+Shift+T"
              value={formData.resultHotkey}
              onChange={(e) => handleInputChange('resultHotkey', e.target.value)}
              onKeyDown={(e) => handleHotkeyKeyDown(e, 'resultHotkey')}
              size="large"
            />
          </Form.Item>
          <Form.Item label="截图识别快捷键" validateStatus={errors.screenshotHotkey ? 'error' : ''} help={errors.screenshotHotkey}>
            <Input
              placeholder="例如：CommandOrControl+Shift+S"
              value={formData.screenshotHotkey}
              onChange={(e) => handleInputChange('screenshotHotkey', e.target.value)}
              onKeyDown={(e) => handleHotkeyKeyDown(e, 'screenshotHotkey')}
              size="large"
            />
          </Form.Item>
          <div style={{ color: '#888' }}>
            支持 Electron 加速器格式，例如：CommandOrControl、Alt、Shift、Super 等组合。
          </div>
        </Form>
      )
    },
  ];

  return (
    <div className="page" id="settings-page">
      <div className="page-header">
        <h1>设置</h1>
      </div>

      <div className="content-area">
        <Collapse items={items} defaultActiveKey={["1"]} />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: 32 }}>
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
      </div>
    </div>
  );
};

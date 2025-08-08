import React from 'react';
import { Card, Button, Descriptions, Space, Spin, Alert } from 'antd';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useConfigStore } from '../stores/configStore';

export const ConfigDisplay: React.FC = () => {
  // 1. 从Zustand store中获取全局配置状态和actions
  const { config, isLoading, error, fetchConfig } = useConfigStore();

  const handleRefresh = () => {
    fetchConfig();
  };

  return (
    <Card 
      title={
        <Space>
          <InfoCircleOutlined />
          全局配置信息 (来自Zustand Store)
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          loading={isLoading}
          onClick={handleRefresh}
        >
          刷新配置
        </Button>
      }
    >
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="正在加载配置..." />
        </div>
      )}
      
      {error && !isLoading && (
          <Alert message={`加载配置出错: ${error}`} type="error" showIcon />
      )}

      {config && !isLoading && !error && (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="API地址" span={2}>
            {config.apiUrl}
          </Descriptions.Item>
          <Descriptions.Item label="API密钥">
            {config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '未设置'}
          </Descriptions.Item>
          <Descriptions.Item label="模型">
            {config.model}
          </Descriptions.Item>
          <Descriptions.Item label="自定义模型">
            {config.customModel || '未设置'}
          </Descriptions.Item>
          <Descriptions.Item label="源语言">
            {config.sourceLang}
          </Descriptions.Item>
          <Descriptions.Item label="目标语言">
            {config.targetLang}
          </Descriptions.Item>
          <Descriptions.Item label="结果窗口快捷键">
            {config.resultHotkey}
          </Descriptions.Item>
          <Descriptions.Item label="截图快捷键">
            {config.screenshotHotkey}
          </Descriptions.Item>
          <Descriptions.Item label="开机自启动">
            {config.autoLaunch ? '是' : '否'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

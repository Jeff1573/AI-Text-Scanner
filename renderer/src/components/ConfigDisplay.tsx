import React, { useState, useEffect } from 'react';
import { Card, Button, Descriptions, message, Space } from 'antd';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface ConfigData {
  apiUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  sourceLang: string;
  targetLang: string;
  resultHotkey: string;
  screenshotHotkey: string;
}

export const ConfigDisplay: React.FC = () => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 获取最新配置（带默认值）
  const loadConfigWithDefaults = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getLatestConfigWithDefaults(true);
      
      if (result.success && result.config) {
        setConfig(result.config);
        setLastUpdate(new Date());
        message.success('配置加载成功');
        console.log('获取到的最新配置（带默认值）:', result.config);
      } else {
        message.error('配置加载失败');
        console.error('配置加载失败:', result.error);
      }
    } catch (error) {
      message.error('配置加载出错');
      console.error('配置加载出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取原始配置（可能为null）
  const loadConfigOriginal = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getLatestConfigWithDefaults(false);
      
      if (result.success) {
        if (result.config) {
          setConfig(result.config);
          setLastUpdate(new Date());
          message.success('原始配置加载成功');
          console.log('获取到的原始配置:', result.config);
        } else {
          setConfig(null);
          setLastUpdate(new Date());
          message.info('没有找到配置文件，返回null');
          console.log('没有找到配置文件');
        }
      } else {
        message.error('配置加载失败');
        console.error('配置加载失败:', result.error);
      }
    } catch (error) {
      message.error('配置加载出错');
      console.error('配置加载出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时自动加载配置
  useEffect(() => {
    loadConfigWithDefaults();
  }, []);

  return (
    <Card 
      title={
        <Space>
          <InfoCircleOutlined />
          配置信息显示
        </Space>
      }
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={loadConfigWithDefaults}
          >
            获取配置（带默认值）
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={loadConfigOriginal}
          >
            获取原始配置
          </Button>
        </Space>
      }
    >
      {config ? (
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
        </Descriptions>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>暂无配置信息</p>
        </div>
      )}
      
      {lastUpdate && (
        <div style={{ marginTop: '16px', textAlign: 'right', color: '#666' }}>
          最后更新: {lastUpdate.toLocaleString()}
        </div>
      )}
    </Card>
  );
};

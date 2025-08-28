import React, { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, Alert, Spin, message, Progress } from 'antd';
import { 
  ReloadOutlined, 
  DownloadOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import type { UpdateStatus, DownloadProgress } from '../types/electron';

const { Text, Title } = Typography;

export const UpdateChecker: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 获取更新状态
  const fetchUpdateStatus = async () => {
    try {
      const result = await window.electronAPI.getUpdateStatus();
      if (result.success && result.status) {
        setUpdateStatus(result.status);
      }
    } catch (error) {
      console.error('获取更新状态失败:', error);
    }
  };

  // 检查更新
  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      
      if (result.success) {
        if (result.checking) {
          messageApi.info('正在检查更新，请稍候...');
        } else if (result.updateAvailable) {
          messageApi.success(`发现新版本: ${result.updateInfo?.version}`);
          await fetchUpdateStatus(); // 刷新状态
        } else {
          messageApi.info('当前已是最新版本');
          await fetchUpdateStatus(); // 刷新状态
        }
      } else {
        messageApi.error(`检查更新失败: ${result.error}`);
      }
    } catch (error) {
      messageApi.error('检查更新时发生错误');
      console.error('检查更新失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 下载更新
  const handleDownloadUpdate = async () => {
    setIsDownloading(true);
    // 设置初始进度而不是null，避免进度条消失
    setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
    
    try {
      const result = await window.electronAPI.downloadUpdate();
      
      if (result.success) {
        messageApi.success('开始下载更新，请稍候...');
        console.log('下载请求成功，等待进度更新...');
        await fetchUpdateStatus(); // 刷新状态
      } else {
        messageApi.error(`下载更新失败: ${result.error}`);
        setIsDownloading(false);
        setDownloadProgress(null);
      }
    } catch (error) {
      messageApi.error('下载更新时发生错误');
      console.error('下载更新失败:', error);
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // 安装更新
  const handleInstallUpdate = async () => {
    setIsInstalling(true);
    try {
      const result = await window.electronAPI.installUpdate();
      
      if (result.success) {
        messageApi.success('开始安装更新，应用将自动重启...');
      } else {
        messageApi.error(`安装更新失败: ${result.error}`);
      }
    } catch (error) {
      messageApi.error('安装更新时发生错误');
      console.error('安装更新失败:', error);
    } finally {
      setIsInstalling(false);
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化下载速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  // 组件挂载时获取状态和监听下载进度
  useEffect(() => {
    fetchUpdateStatus();
    
    // 设置下载进度监听器
    console.log('设置下载进度监听器...');
    window.electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      console.log('收到下载进度更新:', progress);
      setDownloadProgress(progress);
      setIsDownloading(true);
    });
    
    // 🎯 关键：设置准备下载更新监听器
    console.log('设置准备下载更新监听器...');
    window.electronAPI.onPrepareDownloadUpdate((data) => {
      console.log('收到准备下载更新事件:', data);
      
      // 立即设置下载状态和初始进度，显示进度条区域
      setIsDownloading(true);
      setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
      
      // 刷新更新状态，确保显示最新信息
      fetchUpdateStatus();
      
      messageApi.info('准备下载更新，请稍候...');
    });
    
    // 组件卸载时清理监听器
    return () => {
      console.log('清理下载进度监听器...');
      window.electronAPI.removeDownloadProgressListener();
      console.log('清理准备下载更新监听器...');
      window.electronAPI.removePrepareDownloadUpdateListener();
    };
  }, []);

  return (
    <>
      {contextHolder}
      <Card 
        title={
          <Space>
            <InfoCircleOutlined />
            <span>软件更新</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 当前版本信息 */}
          <div>
            <Text strong>当前版本: </Text>
            <Text code>{updateStatus?.currentVersion || '未知'}</Text>
          </div>

          {/* 检查更新按钮 */}
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleCheckForUpdates}
            loading={isChecking}
            disabled={isChecking || isDownloading || isInstalling}
            block
          >
            {isChecking ? '检查中...' : '检查更新'}
          </Button>

          {/* 添加调试信息 */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
              调试信息: isDownloading={isDownloading.toString()}, 
              downloadProgress={downloadProgress ? `${downloadProgress.percent}%` : 'null'}, 
              updateStatus.isDownloading={updateStatus?.isDownloading?.toString()}
            </div>
          )}

          {/* 更新状态显示 */}
          {updateStatus && (
            <>
              {updateStatus.isChecking && (
                <Alert
                  message="正在检查更新"
                  description="请稍候，正在检查是否有新版本可用..."
                  type="info"
                  showIcon
                  icon={<Spin size="small" />}
                />
              )}

              {updateStatus.updateAvailable && updateStatus.updateInfo && (
                <Alert
                  message={`发现新版本 ${updateStatus.updateInfo.version}`}
                  description={
                    <div>
                      <p>当前版本: {updateStatus.currentVersion}</p>
                      <p>新版本: {updateStatus.updateInfo.version}</p>
                      
                      {/* 下载进度显示 */}
                      {(downloadProgress || updateStatus.isDownloading || isDownloading) && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>下载进度:</Text>
                          </div>
                          {downloadProgress && downloadProgress.total > 0 ? (
                            <>
                              <Progress
                                percent={Math.round(downloadProgress.percent)}
                                status={downloadProgress.percent === 100 ? 'success' : 'active'}
                                strokeColor={{
                                  '0%': '#108ee9',
                                  '100%': '#87d068',
                                }}
                              />
                              <div style={{ 
                                marginTop: 8, 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#666'
                              }}>
                                <span>
                                  {formatFileSize(downloadProgress.transferred)} / {formatFileSize(downloadProgress.total)}
                                </span>
                                <span>
                                  {formatSpeed(downloadProgress.bytesPerSecond)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Progress percent={0} status="active" />
                              <div style={{ 
                                marginTop: 8, 
                                fontSize: '12px',
                                color: '#666',
                                textAlign: 'center'
                              }}>
                                准备下载中...
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {updateStatus.updateInfo.releaseNotes && (
                        <details style={{ marginTop: 8 }}>
                          <summary>更新说明</summary>
                          <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                            {updateStatus.updateInfo.releaseNotes}
                          </div>
                        </details>
                      )}
                    </div>
                  }
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  action={
                    <Space>
                      {!updateStatus.isDownloading && !isDownloading && downloadProgress?.percent !== 100 && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={handleDownloadUpdate}
                          loading={isDownloading}
                          disabled={isDownloading || isInstalling}
                        >
                          下载更新
                        </Button>
                      )}
                      {(updateStatus.isDownloading || isDownloading) && downloadProgress?.percent !== 100 && (
                        <Button
                          size="small"
                          type="primary"
                          loading={true}
                          disabled={true}
                        >
                          下载中... {downloadProgress?.percent ? Math.round(downloadProgress.percent) + '%' : ''}
                        </Button>
                      )}
                      {downloadProgress?.percent === 100 && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={handleInstallUpdate}
                          loading={isInstalling}
                          disabled={isInstalling}
                        >
                          {isInstalling ? '安装中...' : '立即安装'}
                        </Button>
                      )}
                    </Space>
                  }
                />
              )}

              {!updateStatus.isChecking && !updateStatus.updateAvailable && (
                <Alert
                  message="当前已是最新版本"
                  description={`您正在使用最新版本 ${updateStatus.currentVersion}`}
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}
            </>
          )}

          {/* 错误状态 */}
          {!updateStatus && (
            <Alert
              message="无法获取更新状态"
              description="请检查网络连接或稍后重试"
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          )}
        </Space>
      </Card>
    </>
  );
};

import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConfigProvider, Modal, Button, Typography, Space, message, Alert } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import { useMainAppState } from "../hooks/useMainAppState";
import type { UpdateAvailableNotice } from "../types/electron";
import { TitleBar } from "./TitleBar";
import { ReleaseNotesViewer } from "./ReleaseNotesViewer";
import "../assets/styles/index.css";

export const Layout = () => {
  const { isSidebarCollapsed, toggleSidebar } = useMainAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const [version, setVersion] = useState<string | null>(null);
  const [updateNotice, setUpdateNotice] = useState<UpdateAvailableNotice | null>(null);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const { Paragraph, Text } = Typography;

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const result = await window.electronAPI.getVersion();
        if (result.success && result.version) {
          setVersion(result.version);
        }
      } catch (error) {
        console.error("Failed to fetch version:", error);
      }
    };

    fetchVersion();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateAvailableNotice) {
      return;
    }

    // 监听主进程推送的更新事件，用于自动提醒用户
    const handleNotice = (data: UpdateAvailableNotice) => {
      // 同步通知其它前端模块（如设置页）刷新状态
      window.dispatchEvent(
        new CustomEvent("app-update-available-notice", { detail: data })
      );

      if (data.source !== "automatic") {
        return;
      }

      setDownloadError(null);
      setIsDownloadLoading(false);
      setUpdateNotice(data);

      const versionLabel = data.updateInfo?.version
        ? ` ${data.updateInfo.version}`
        : "";
      messageApi.info(`发现新版本${versionLabel}，请及时更新。`);
    };

    window.electronAPI.onUpdateAvailableNotice(handleNotice);

    return () => {
      window.electronAPI.removeUpdateAvailableNoticeListener();
    };
  }, [messageApi]);

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleDownloadUpdate = async () => {
    setIsDownloadLoading(true);
    setDownloadError(null);
    try {
      const result = await window.electronAPI.downloadUpdate();
      if (result.success) {
        messageApi.success("开始下载更新，已打开设置页以便查看进度。");
        setUpdateNotice(null);
        window.location.hash = "#/settings";
      } else {
        setDownloadError(result.error || "下载更新失败");
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsDownloadLoading(false);
    }
  };

  const handleRemindLater = () => {
    setUpdateNotice(null);
    setDownloadError(null);
    messageApi.info("可稍后在设置页手动下载更新。");
  };

  const handleOpenSettings = () => {
    window.location.hash = "#/settings";
    setUpdateNotice(null);
    setDownloadError(null);
  };

  // 根据当前路径确定活动菜单项
  const isSettingsActive = location.pathname === "/" || location.pathname === "/settings";

  // 菜单项配置
  const menuItems = [
    {
      id: "settings",
      path: "/",
      icon: "⚙️",
      text: "设置",
      isActive: isSettingsActive,
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app-container">
        {messageContextHolder}
        {/* 自定义标题栏 */}
        <TitleBar />

        {/* 左侧菜单 */}
        <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          {/* <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">📷</div>
              <div className="logo-text">AI Text Scanner</div>
            </div>
          </div> */}

          <nav className="menu">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`menu-item ${item.isActive ? "active" : ""}`}
                onClick={() => handleMenuClick(item.path)}
              >
                <div className="menu-icon">{item.icon}</div>
                <div className="menu-text">{item.text}</div>
              </div>
            ))}

            {/* 侧边栏切换按钮放在菜单底部 */}
            <div className="menu-toggle-container">
              <button className="sidebar-toggle" onClick={toggleSidebar}>
                <span className="toggle-icon">◀</span>
              </button>
            </div>
          </nav>
        </div>

        {/* 主内容区域 */}
        <div className="main-content">
          <Outlet />
          {version && (
            <footer className="app-footer">
              Version: v{version}
            </footer>
          )}
        </div>

        {updateNotice && (
          <Modal
            open
            title={`发现新版本 ${updateNotice.updateInfo?.version ?? ""}`}
            okText="立即下载"
            cancelText="稍后提醒"
            onOk={handleDownloadUpdate}
            onCancel={handleRemindLater}
            confirmLoading={isDownloadLoading}
            maskClosable={!isDownloadLoading}
            closable={!isDownloadLoading}
            cancelButtonProps={{ disabled: isDownloadLoading }}
            destroyOnClose
          >
            <Paragraph>
              <Text>检测到应用存在可用更新。</Text>
            </Paragraph>
            <Paragraph>
              <Text type="secondary">当前版本：</Text>
              <Text> {updateNotice.currentVersion}</Text>
              <br />
              <Text type="secondary">新版本：</Text>
              <Text>
                {" "}
                {updateNotice.updateInfo?.version ?? "未知"}
              </Text>
            </Paragraph>
            {updateNotice.updateInfo?.releaseNotes && (
              <Paragraph>
                <Text strong>更新说明：</Text>
                <div style={{ marginTop: 8 }}>
                  <ReleaseNotesViewer html={String(updateNotice.updateInfo.releaseNotes)} />
                </div>
              </Paragraph>
            )}
            {downloadError && (
              <Alert
                type="error"
                showIcon
                message="下载更新失败"
                description={downloadError}
                style={{ marginTop: 12 }}
              />
            )}
            <Space style={{ marginTop: 16 }}>
              <Button type="link" onClick={handleOpenSettings}>
                查看设置页
              </Button>
            </Space>
          </Modal>
        )}
      </div>
    </ConfigProvider>
  );
};

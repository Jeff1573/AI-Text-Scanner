import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useMainAppState } from "../hooks/useMainAppState";
import { TitleBar } from "./TitleBar";
import "../assets/styles/index.css";

export const Layout = () => {
  const { isSidebarCollapsed, toggleSidebar } = useMainAppState();
  const location = useLocation();
  const navigate = useNavigate();

  // 根据当前路径确定活动菜单项
  const isHomeActive = location.pathname === "/";
  const isSettingsActive = location.pathname === "/settings";

  // 菜单项配置
  const menuItems = [
    {
      id: "home",
      path: "/",
      icon: "🏠",
      text: "首页",
      isActive: isHomeActive,
    },
    {
      id: "settings",
      path: "/settings",
      icon: "⚙️",
      text: "设置",
      isActive: isSettingsActive,
    },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app-container">
        {/* 自定义标题栏 */}
        <TitleBar />

        {/* 左侧菜单 */}
        <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          {/* <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">📷</div>
              <div className="logo-text">Fast OCR</div>
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
        </div>
      </div>
    </ConfigProvider>
  );
};

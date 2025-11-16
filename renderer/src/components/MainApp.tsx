import { RouterProvider } from 'react-router-dom';
import { router } from '../routes';
import { useEffect } from 'react';
import { TrayProvider } from '../contexts/TrayContext';

export const MainApp = () => {
  useEffect(() => {
    // 检查 window.electronAPI 是否可用
    if (!window.electronAPI) {
      console.warn('window.electronAPI 未定义，某些功能可能不可用');
      return;
    }

    // 监听全局快捷键事件
    const handleOpenResultPage = () => {
      // 通过修改URL hash来导航到ResultPage
      window.location.hash = '#/result';
    };

    const handleOpenScreenshotViewer = (screenshotData: { id: string; name: string; thumbnail: string }) => {
      // 通过修改URL hash来导航到ScreenshotViewer
      window.location.hash = '#/screenshot';
      
      // 延迟一点时间确保路由已经切换，然后发送截图数据
      setTimeout(() => {
        // 通过自定义事件将截图数据传递给ScreenshotViewer组件
        const event = new CustomEvent('screenshot-data-received', { 
          detail: screenshotData 
        });
        window.dispatchEvent(event);
      }, 100);
    };

    const handleOpenSettingsPage = () => {
      // 通过修改URL hash来导航到SettingsPage
      window.location.hash = '#/settings';
    };

    // 监听导航事件（从其他窗口触发）
    const handleNavigateTo = (_event: unknown, route: string) => {
      console.log("收到导航请求:", route);
      const targetHash = `#${route}`;
      const isSameRoute = window.location.hash === targetHash;
      window.location.hash = targetHash;

      if (route === "/image-analysis" && isSameRoute) {
        setTimeout(() => {
          const evt = new Event("image-analysis-refresh");
          window.dispatchEvent(evt);
        }, 0);
      }
    };

    // 注册事件监听器
    window.electronAPI.onOpenResultPage(handleOpenResultPage);
    window.electronAPI.onOpenScreenshotViewer(handleOpenScreenshotViewer);
    window.electronAPI.onOpenSettingsPage(handleOpenSettingsPage);
    
    // 监听导航事件
    if (window.electronAPI.onNavigateTo) {
      window.electronAPI.onNavigateTo(handleNavigateTo);
    }

    // 清理函数
    return () => {
      window.electronAPI.removeOpenResultPageListener();
      window.electronAPI.removeOpenScreenshotViewerListener();
      window.electronAPI.removeOpenSettingsPageListener();
      
      if (window.electronAPI.removeNavigateToListener) {
        window.electronAPI.removeNavigateToListener();
      }
    };
  }, []);

  return (
    <TrayProvider>
      <RouterProvider router={router} />
    </TrayProvider>
  );
}; 

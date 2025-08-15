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

    // 注册事件监听器
    window.electronAPI.onOpenResultPage(handleOpenResultPage);
    window.electronAPI.onOpenScreenshotViewer(handleOpenScreenshotViewer);
    window.electronAPI.onOpenSettingsPage(handleOpenSettingsPage);

    // 清理函数
    return () => {
      window.electronAPI.removeOpenResultPageListener();
      window.electronAPI.removeOpenScreenshotViewerListener();
      window.electronAPI.removeOpenSettingsPageListener();
    };
  }, []);

  return (
    <TrayProvider>
      <RouterProvider router={router} />
    </TrayProvider>
  );
}; 
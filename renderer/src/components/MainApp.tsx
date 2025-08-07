import { RouterProvider } from 'react-router-dom';
import { router } from '../routes';
import { useEffect } from 'react';

export const MainApp = () => {
  useEffect(() => {
    // 监听全局快捷键事件
    const handleOpenResultPage = () => {
      // 通过修改URL hash来导航到ResultPage
      window.location.hash = '#/result';
    };

    // 注册事件监听器
    window.electronAPI.onOpenResultPage(handleOpenResultPage);

    // 清理函数
    return () => {
      window.electronAPI.removeOpenResultPageListener();
    };
  }, []);

  return <RouterProvider router={router} />;
}; 
import { RouterProvider } from 'react-router-dom';
import { router } from '../routes';

export const MainApp = () => {
  return <RouterProvider router={router} />;
}; 
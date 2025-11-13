import React, { createContext, useContext, useEffect } from 'react';
import { useTrayState } from '../hooks/useTrayState';

interface TrayContextType {
  isTrayAvailable: boolean;
  isMinimizedToTray: boolean;
  isTrayInitialized: boolean;
  hideToTray: () => Promise<void>;
  showFromTray: () => Promise<void>;
  checkTrayAvailability: () => Promise<void>;
}

const TrayContext = createContext<TrayContextType | undefined>(undefined);

export const useTrayContext = () => {
  const context = useContext(TrayContext);
  if (context === undefined) {
    throw new Error('useTrayContext must be used within a TrayProvider');
  }
  return context;
};

interface TrayProviderProps {
  children: React.ReactNode;
}

export const TrayProvider: React.FC<TrayProviderProps> = ({ children }) => {
  const [state, actions] = useTrayState();

  // 初始化时检查托盘可用性
  useEffect(() => {
    actions.checkTrayAvailability();
  }, []); // 只在组件挂载时执行一次

  const contextValue: TrayContextType = {
    ...state,
    ...actions,
  };

  return (
    <TrayContext.Provider value={contextValue}>
      {children}
    </TrayContext.Provider>
  );
};

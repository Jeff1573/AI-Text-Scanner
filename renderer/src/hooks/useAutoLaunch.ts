import { useCallback, useEffect, useState } from 'react';

interface GetLoginItemSettingsResult {
  success: boolean;
  openAtLogin?: boolean;
  error?: string;
}

export const useAutoLaunch = () => {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = (await window.electronAPI.getLoginItemSettings()) as GetLoginItemSettingsResult & { raw?: unknown };
      if (res?.success) {
        setEnabledState(!!res.openAtLogin);
      } else {
        setError(res?.error || '获取开机自启动状态失败');
      }
    } catch (e: any) {
      setError(e?.message || '获取开机自启动状态失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = (await window.electronAPI.setLoginItemSettings(next)) as GetLoginItemSettingsResult;
      if (res?.success) {
        setEnabledState(!!res.openAtLogin);
      } else {
        setError(res?.error || '设置开机自启动失败');
        throw new Error(res?.error || '设置开机自启动失败');
      }
    } catch (e: any) {
      setError(e?.message || '设置开机自启动失败');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { enabled, loading, error, refresh, setEnabled };
};


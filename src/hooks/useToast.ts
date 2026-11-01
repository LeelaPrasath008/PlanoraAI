import { useState, useCallback, useEffect } from 'react';

export interface ToastNotice {
  message: string;
  tone: 'info' | 'warning';
}

/**
 * Custom hook managing transient workspace status notifications (`role="status"` / `role="alert"`).
 */
export function useToast() {
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);

  const notify = useCallback(
    (message: string, tone: 'info' | 'warning' = 'info') => {
      setToastNotice({ message, tone });
    },
    []
  );

  const dismissToast = useCallback(() => {
    setToastNotice(null);
  }, []);

  useEffect(() => {
    if (!toastNotice) return;
    const timer = window.setTimeout(() => setToastNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastNotice]);

  return { toastNotice, notify, dismissToast };
}

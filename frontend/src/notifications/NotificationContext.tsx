import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';

export type NotificationType = 'error' | 'success' | 'warning' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationContextValue {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 6000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: NotificationType = 'error') => {
      const id = nextId.current++;
      setNotifications((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack">
        {notifications.map((n) => (
          <div key={n.id} className={`toast toast--${n.type}`} role="alert">
            <span>{n.message}</span>
            <button className="toast__close" onClick={() => dismiss(n.id)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify(): (message: string, type?: NotificationType) => void {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotify deve ser usado dentro de um NotificationProvider.');
  }
  return ctx.notify;
}

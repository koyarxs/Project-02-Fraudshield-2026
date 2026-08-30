import { useEffect, useRef, useState } from 'react';
import { FiBell, FiCheck, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import notificationService, {
  type ApiNotification,
} from '../../services/notification.service';

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const feed = await notificationService.findAll();
        if (active) {
          setItems(feed.items);
          setUnreadCount(feed.unreadCount);
        }
      } catch {
        // La autorización global presenta cualquier error de sesión.
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    const handleFocus = () => void load();
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openNotification = async (notification: ApiNotification) => {
    if (!notification.readAt) {
      await notificationService.markAsRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setIsOpen(false);
    navigate(
      `/case-management?transactionId=${notification.riskCase.transactionId}`,
    );
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt })));
    setUnreadCount(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Notificaciones"
      >
        <FiBell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          role="dialog"
          aria-label="Notificaciones internas"
          className="fixed left-4 right-4 top-24 z-[80] w-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(25rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Notificaciones</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount} sin leer
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
              >
                <FiCheck className="h-4 w-4" aria-hidden="true" />
                Marcar todas como leídas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(65vh,32rem)] overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                Cargando notificaciones...
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                No tienes notificaciones todavía.
              </p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition hover:bg-blue-50 ${
                    notification.readAt ? 'bg-white' : 'bg-blue-50/70'
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-5 text-slate-900">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Caso RC-{String(notification.riskCaseId).padStart(3, '0')}
                        {' · '}
                        {notification.actor?.name ?? 'Sistema'}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <FiClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        notification.readAt
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {notification.readAt ? 'Leída' : 'No leída'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

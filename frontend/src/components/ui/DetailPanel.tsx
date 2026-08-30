import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

type DetailTone =
  | 'slate'
  | 'blue'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'violet';

interface DetailPanelProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  meta?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function DetailPanel({
  icon,
  eyebrow,
  title,
  badge,
  meta,
  children,
  footer,
  onClose,
}: DetailPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-end bg-slate-950/40 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/25 sm:h-auto sm:max-h-[90vh] sm:w-[560px] sm:max-w-[calc(100vw-2.5rem)] sm:rounded-[24px]"
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                  {eyebrow}
                </p>
                {badge}
              </div>
              <h2
                id={titleId}
                className="mt-1 break-words text-xl font-bold text-slate-950 sm:text-2xl"
              >
                {title}
              </h2>
              {meta ? (
                <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                  {meta}
                </p>
              ) : null}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              aria-label="Cerrar detalle"
            >
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
          <div className="space-y-4">{children}</div>
        </div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

export function DetailSection({
  title,
  description,
  children,
  tone = 'slate',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: DetailTone;
}) {
  const tones: Record<DetailTone, string> = {
    slate: 'border-slate-200 bg-slate-50/70',
    blue: 'border-blue-100 bg-blue-50/60',
    cyan: 'border-cyan-100 bg-cyan-50/60',
    emerald: 'border-emerald-100 bg-emerald-50/60',
    amber: 'border-amber-100 bg-amber-50/60',
    red: 'border-red-100 bg-red-50/60',
    violet: 'border-violet-100 bg-violet-50/60',
  };

  return (
    <section className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid min-w-0 gap-3 sm:grid-cols-2">{children}</dl>;
}

export function DetailField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">
        {value ?? 'No disponible'}
      </dd>
    </div>
  );
}

export function DetailBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: DetailTone;
}) {
  const tones: Record<DetailTone, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function DetailNote({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: DetailTone;
}) {
  const tones: Record<DetailTone, string> = {
    slate: 'border-slate-200 bg-white text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-900',
  };

  return (
    <p className={`rounded-xl border px-3 py-2 text-sm leading-6 ${tones[tone]}`}>
      {children}
    </p>
  );
}

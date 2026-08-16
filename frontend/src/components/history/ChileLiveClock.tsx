import { useEffect, useMemo, useState } from 'react';
import { FiClock } from 'react-icons/fi';

const CHILE_TIME_ZONE = 'America/Santiago';

interface ChileLiveClockProps {
  variant?: 'light' | 'sidebar';
  compact?: boolean;
}

export default function ChileLiveClock({
  variant = 'light',
  compact = false,
}: ChileLiveClockProps) {
  const [now, setNow] = useState(() => new Date());
  const isSidebar = variant === 'sidebar';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: CHILE_TIME_ZONE,
      }),
    [],
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: CHILE_TIME_ZONE,
      }),
    [],
  );

  return (
    <section
      className={
        isSidebar
          ? `flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-left shadow-sm shadow-blue-950/20 transition-all duration-300 ${
              compact ? 'lg:flex-col lg:gap-2 lg:px-2 lg:py-3 lg:text-center' : ''
            }`
          : 'flex min-w-[220px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm'
      }
      aria-label="Fecha y hora actual de Chile"
      aria-live="polite"
    >
      <span
        className={
          isSidebar
            ? `flex shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/10 ${
                compact ? 'h-9 w-9' : 'h-10 w-10'
              }`
            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100'
        }
      >
        <FiClock className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span
          className={
            isSidebar
              ? `hidden truncate text-[11px] font-semibold capitalize text-blue-100/80 sm:block ${
                  compact ? 'lg:hidden' : ''
                }`
              : 'block truncate text-xs font-semibold capitalize text-slate-600'
          }
        >
          {dateFormatter.format(now)}
        </span>
        <span
          className={
            isSidebar
              ? `block font-bold leading-none text-white ${
                  compact ? 'text-sm' : 'text-base sm:mt-0.5'
                }`
              : 'mt-0.5 block text-lg font-bold leading-none text-slate-950'
          }
        >
          {timeFormatter.format(now)}
        </span>
        <span
          className={
            isSidebar
              ? `mt-1 block text-[11px] font-medium text-blue-100/70 ${
                  compact ? 'lg:text-[10px]' : ''
                }`
              : 'mt-1 block text-xs text-slate-500'
          }
        >
          {compact ? 'Chile' : 'Hora de Chile'}
        </span>
      </span>
    </section>
  );
}

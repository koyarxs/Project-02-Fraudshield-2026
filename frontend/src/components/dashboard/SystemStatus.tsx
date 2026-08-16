import { FiCheckCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { formatDate } from '../../utils/formatDate';

interface SystemStatusProps {
  lastUpdated?: string;
  apiAvailable: boolean;
  isAuthenticated: boolean;
  hasMetrics: boolean;
  hasCompletedBatch: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function SystemStatus({
  lastUpdated,
  apiAvailable,
  isAuthenticated,
  hasMetrics,
  hasCompletedBatch,
  isRefreshing,
  onRefresh,
}: SystemStatusProps) {
  const statusItems = [
    { label: 'API accesible', active: apiAvailable },
    { label: 'Sesión autenticada', active: isAuthenticated },
    { label: 'Métricas disponibles', active: hasMetrics },
    { label: 'Último lote completado', active: hasCompletedBatch },
  ];

  return (
    <section className="app-card rounded-[24px] p-5 text-left lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Estado del sistema
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitoreo temporal de servicios base.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Actualizar estado del sistema"
          title="Actualizar"
        >
          <FiRefreshCw
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {item.active ? (
              <FiCheckCircle
                className="h-5 w-5 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <FiXCircle
                className="h-5 w-5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            )}
            <span className="text-sm font-semibold text-slate-700">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
          Última actualización
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {lastUpdated ? formatDate(lastUpdated) : 'Sin procesamientos'}
        </p>
      </div>
    </section>
  );
}

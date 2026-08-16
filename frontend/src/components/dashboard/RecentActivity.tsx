import { FiCheckCircle } from 'react-icons/fi';
import type { ProcessingBatch } from '../../types/processing';
import { formatDate, formatNumber } from '../../utils/formatDate';

interface RecentActivityProps {
  batches: ProcessingBatch[];
}

export default function RecentActivity({ batches }: RecentActivityProps) {
  const activities = batches.slice(0, 10).map((batch) => ({
    id: batch.batchId,
    title: 'Procesamiento completado',
    description: `${batch.fileName} · ${formatNumber(batch.totalRecords)} registros clasificados`,
    date: batch.uploadedAt,
  }));

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        Actividad reciente
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Actividad derivada de procesamientos reales disponibles en esta
        sesión.
      </p>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
          No hay actividad reciente registrada.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <FiCheckCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  {activity.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {activity.description}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {formatDate(activity.date)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import type { ProcessingBatch } from '../../types/processing';
import { formatDate, formatNumber } from '../../utils/formatDate';

interface BatchSelectorProps {
  batches: ProcessingBatch[];
  selectedBatchId?: number;
  onSelect: (batchId: number) => void;
}

export default function BatchSelector({
  batches,
  selectedBatchId,
  onSelect,
}: BatchSelectorProps) {
  if (batches.length === 0) {
    return (
      <section className="app-card rounded-[24px] p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Selector de lote
        </h2>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
          No hay lotes procesados disponibles. Carga un archivo CSV para
          comenzar.
        </div>
      </section>
    );
  }

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Selector de lote
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Lotes procesados
          </h2>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {batches.length} disponibles
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {batches.map((batch) => {
          const isSelected = batch.batchId === selectedBatchId;

          return (
            <button
              key={batch.batchId}
              type="button"
              onClick={() => onSelect(batch.batchId)}
              className={[
                'rounded-[24px] border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/70',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                    Batch #{batch.batchId}
                  </p>
                  <h3 className="mt-2 break-all text-base font-bold text-slate-950">
                    {batch.fileName}
                  </h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {batch.status}
                </span>
              </div>

              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <FiClock className="h-4 w-4" aria-hidden="true" />
                {formatDate(batch.uploadedAt)}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Total" value={batch.totalRecords} />
                <Metric
                  label="Alto"
                  value={batch.highRiskCount}
                  className="text-red-700"
                  icon={<FiAlertTriangle className="h-4 w-4" />}
                />
                <Metric
                  label="Medio"
                  value={batch.mediumRiskCount}
                  className="text-amber-700"
                />
                <Metric
                  label="Bajo"
                  value={batch.lowRiskCount}
                  className="text-emerald-700"
                  icon={<FiCheckCircle className="h-4 w-4" />}
                />
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  className = 'text-slate-950',
  icon,
}: {
  label: string;
  value: number;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`mt-1 flex items-center gap-1.5 font-bold ${className}`}>
        {icon}
        {formatNumber(value)}
      </dd>
    </div>
  );
}

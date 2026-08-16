import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiShield,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { ProcessingBatch } from '../../types/processing';
import { formatDate, formatNumber } from '../../utils/formatDate';

interface BatchSummaryProps {
  batch: ProcessingBatch;
}

export default function BatchSummary({ batch }: BatchSummaryProps) {
  const metrics = [
    {
      label: 'Total de registros',
      value: batch.totalRecords,
      icon: FiBarChart2,
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      label: 'Riesgo Alto',
      value: batch.highRiskCount,
      icon: FiAlertTriangle,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    {
      label: 'Riesgo Medio',
      value: batch.mediumRiskCount,
      icon: FiShield,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      label: 'Riesgo Bajo',
      value: batch.lowRiskCount,
      icon: FiCheckCircle,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Resumen del lote seleccionado
          </p>
          <h2 className="mt-2 break-all text-2xl font-bold text-slate-950">
            Batch #{batch.batchId} · {batch.fileName}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {formatDate(batch.uploadedAt)} · Estado {batch.status}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <SummaryMetric key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: IconType;
  className: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {formatNumber(value)}
          </p>
        </div>
      </div>
    </article>
  );
}

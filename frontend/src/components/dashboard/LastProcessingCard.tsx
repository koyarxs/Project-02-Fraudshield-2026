import { Link } from 'react-router-dom';
import { FiClock, FiFileText } from 'react-icons/fi';
import type { ProcessingBatch } from '../../types/processing';
import { formatDate, formatNumber } from '../../utils/formatDate';

interface LastProcessingCardProps {
  batch?: ProcessingBatch;
}

export default function LastProcessingCard({
  batch,
}: LastProcessingCardProps) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
            Último procesamiento
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {batch ? batch.fileName : 'Sin procesamiento registrado'}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <FiClock className="h-4 w-4" aria-hidden="true" />
            {batch ? formatDate(batch.uploadedAt) : 'No disponible'}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <FiFileText className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {batch ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Batch ID" value={`#${batch.batchId}`} />
            <Info label="Estado" value={batch.status} />
            <Info label="Total" value={formatNumber(batch.totalRecords)} />
            <Info
              label="Riesgos"
              value={`A ${batch.highRiskCount} · M ${batch.mediumRiskCount} · B ${batch.lowRiskCount}`}
            />
          </dl>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ActionLink to={`/results?batchId=${batch.batchId}`}>
              Ver resultados
            </ActionLink>
            <ActionLink to="/transactions">Ver transacciones</ActionLink>
            <ActionLink to="/history">Ver historial</ActionLink>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
          Aún no existen lotes procesados. Carga un archivo CSV para
          comenzar.
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function ActionLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

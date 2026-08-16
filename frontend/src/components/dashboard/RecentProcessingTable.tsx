import { Link } from 'react-router-dom';
import type { ProcessingBatch, ProcessingStatus, RiskLevel } from '../../types/processing';
import { getDominantRisk } from '../../services/processing-store.service';
import { formatDate, formatNumber } from '../../utils/formatDate';

const badgeClasses: Record<RiskLevel | ProcessingStatus, string> = {
  Completado: 'bg-blue-50 text-blue-700 ring-blue-100',
  Alto: 'bg-red-50 text-red-700 ring-red-100',
  Medio: 'bg-amber-50 text-amber-700 ring-amber-100',
  Bajo: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

function Badge({ label }: { label: RiskLevel | ProcessingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClasses[label]}`}>
      {label}
    </span>
  );
}

interface RecentProcessingTableProps {
  rows: ProcessingBatch[];
}

export default function RecentProcessingTable({
  rows,
}: RecentProcessingTableProps) {
  return (
    <section className="app-card rounded-[24px] p-5 text-left lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        Procesamientos recientes
      </h2>

      <div className="mt-5 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
            No existen procesamientos reales disponibles en el frontend.
          </div>
        ) : (
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              {['Archivo', 'Fecha', 'Registros', 'Estado', 'Riesgo predominante'].map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 first:pl-0"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.batchId} className="align-middle transition hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2.5 pl-0 text-sm font-semibold text-slate-900">
                  <Link
                    to={`/results?batchId=${row.batchId}`}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    {row.fileName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
                  {formatDate(row.uploadedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-700">
                  {formatNumber(row.totalRecords)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Badge label={row.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Badge label={getDominantRisk(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </section>
  );
}

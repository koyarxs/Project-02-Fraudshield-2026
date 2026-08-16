import type { ApiTransaction } from '../../types/transaction';
import { formatCurrencyCLP } from '../../utils/formatDate';
import {
  fallback,
  formatTransactionDateTime,
  getTransactionLocation,
  normalizeRiskLevel,
} from './transactionViewUtils';

interface TransactionsTableProps {
  transactions: ApiTransaction[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSelectTransaction: (transaction: ApiTransaction) => void;
}

const riskBadgeClasses = {
  Alto: 'bg-red-50 text-red-700 ring-red-100',
  Medio: 'bg-amber-50 text-amber-700 ring-amber-100',
  Bajo: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

export default function TransactionsTable({
  transactions,
  page,
  pageSize,
  onPageChange,
  onSelectTransaction,
}: TransactionsTableProps) {
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleTransactions = transactions.slice(start, start + pageSize);

  if (transactions.length === 0) {
    return (
      <div className="app-card rounded-[24px] p-5">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
          No hay transacciones que coincidan con los filtros aplicados.
        </div>
      </div>
    );
  }

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Tabla de transacciones
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una fila para ver su detalle.
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          Página {currentPage} de {totalPages}
        </span>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1100px] divide-y divide-slate-200 bg-white">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {[
                'Código',
                'Cliente',
                'Fecha y hora',
                'Monto',
                'Ubicación',
                'Riesgo',
                'Regla / motivo',
                'Batch',
              ].map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleTransactions.map((transaction) => {
              const riskLevel = normalizeRiskLevel(
                transaction.riskResult?.riskLevel?.name,
              );

              return (
                <tr
                  key={transaction.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelectTransaction(transaction)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectTransaction(transaction);
                    }
                  }}
                  className="cursor-pointer align-top transition hover:bg-blue-50/50 focus:bg-blue-50 focus:outline-none"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-950">
                    {fallback(transaction.transactionCode)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                    {fallback(transaction.customerCode)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                    {formatTransactionDateTime(transaction)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-950">
                    {formatCurrencyCLP(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                    {getTransactionLocation(transaction)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {riskLevel ? (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${riskBadgeClasses[riskLevel]}`}
                      >
                        Riesgo {riskLevel}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">
                        No disponible
                      </span>
                    )}
                  </td>
                  <td className="min-w-72 px-3 py-2.5 text-sm leading-6 text-slate-700">
                    {fallback(transaction.riskResult?.observation)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
                    #{transaction.batchId}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Mostrando {start + 1}-{Math.min(start + pageSize, transactions.length)} de{' '}
            {transactions.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

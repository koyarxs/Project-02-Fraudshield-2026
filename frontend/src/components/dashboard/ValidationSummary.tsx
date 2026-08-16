import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import type { ApiTransaction } from '../../types/transaction';

interface ValidationSummaryProps {
  transactions: ApiTransaction[];
  lastError?: string;
}

export default function ValidationSummary({
  transactions,
  lastError,
}: ValidationSummaryProps) {
  const validationErrors = transactions.flatMap(
    (transaction) => transaction.validationErrors ?? [],
  );

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        Validaciones del sistema
      </h2>

      {lastError ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Error reciente</p>
            <p className="mt-1">{lastError}</p>
          </div>
        </div>
      ) : validationErrors.length > 0 ? (
        <div className="mt-5 space-y-3">
          {validationErrors.slice(0, 5).map((error, index) => (
            <div
              key={`${error.transactionId ?? 'validation'}-${index}`}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <p className="font-bold">{error.field ?? 'Validación'}</p>
              <p className="mt-1">{error.message ?? 'Mensaje no disponible'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>No se registran validaciones pendientes.</p>
        </div>
      )}
    </section>
  );
}

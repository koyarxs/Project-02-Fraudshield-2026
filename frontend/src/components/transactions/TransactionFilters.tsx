import type { ApiTransaction } from '../../types/transaction';
import type {
  TransactionFiltersState,
  TransactionRiskFilter,
} from './transactionViewUtils';

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  transactions: ApiTransaction[];
  resultCount: number;
  onChange: (filters: TransactionFiltersState) => void;
  onClear: () => void;
}

export default function TransactionFilters({
  filters,
  transactions,
  resultCount,
  onChange,
  onClear,
}: TransactionFiltersProps) {
  const hasRisk = transactions.some(
    (transaction) => transaction.riskResult?.riskLevel?.name,
  );
  const hasRule = transactions.some(
    (transaction) => transaction.riskResult?.observation,
  );

  if (transactions.length === 0) {
    return null;
  }

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Filtros</h2>
          <p className="mt-1 text-sm text-slate-500">
            {resultCount} resultados encontrados
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_1fr]">
        {hasRisk && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Nivel de riesgo
            </span>
            <select
              value={filters.risk}
              onChange={(event) =>
                onChange({
                  ...filters,
                  risk: event.target.value as TransactionRiskFilter,
                })
              }
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option>Todos</option>
              <option>Alto</option>
              <option>Medio</option>
              <option>Bajo</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Buscar por código, cliente o ubicación
          </span>
          <input
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Ej: TX-001, CLI-100, Santiago"
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {hasRule && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Regla aplicada
            </span>
            <input
              value={filters.rule}
              onChange={(event) =>
                onChange({ ...filters, rule: event.target.value })
              }
              placeholder="Ej: R1, horario nocturno"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        )}
      </div>
    </section>
  );
}

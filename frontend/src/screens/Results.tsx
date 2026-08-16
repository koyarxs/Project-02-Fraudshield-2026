import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiDownload,
  FiEye,
  FiFileText,
  FiSearch,
  FiShield,
  FiUploadCloud,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import { historyService } from '../services/history.service';
import transactionService from '../services/transaction.service';
import type { HistoryRecord } from '../types/history';
import type {
  ApiTransaction,
  RiskRuleDetail,
} from '../types/transaction';
import type { RiskLevel } from '../types/processing';
import { exportRowsToCsv } from '../utils/exportCsv';
import {
  formatCurrencyCLP,
  formatDate,
  formatNumber,
} from '../utils/formatDate';

type RiskFilter = RiskLevel | 'Todos';
type SortMode = 'score-desc' | 'score-asc';

interface RiskMetrics {
  total: number;
  low: number;
  medium: number;
  high: number;
  averageScore: number | null;
}

const PAGE_SIZE = 8;

const riskBadgeClasses: Record<RiskLevel, string> = {
  Alto: 'bg-red-50 text-red-700 ring-red-100',
  Medio: 'bg-amber-50 text-amber-700 ring-amber-100',
  Bajo: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const riskChartColors: Record<RiskLevel, string> = {
  Bajo: '#10b981',
  Medio: '#f59e0b',
  Alto: '#ef4444',
};

const actionByRisk: Record<RiskLevel, string> = {
  Bajo: 'Monitoreo',
  Medio: 'Requiere revisión',
  Alto: 'Revisión prioritaria',
};

export default function Results() {
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState<HistoryRecord[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ApiTransaction | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('Todos');
  const [sortMode, setSortMode] = useState<SortMode>('score-desc');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMessage, setExportMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let shouldIgnore = false;

    async function loadBatches() {
      setIsLoading(true);
      setError('');

      try {
        const response = await historyService.findAll();

        if (!shouldIgnore) {
          setBatches(response.filter((batch) => hasProcessedResults(batch)));
        }
      } catch {
        if (!shouldIgnore) {
          setBatches([]);
          setError('No fue posible consultar resultados procesados.');
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadBatches();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const requestedBatchId = Number(searchParams.get('batchId'));
  const selectedBatch =
    Number.isFinite(requestedBatchId) && requestedBatchId > 0
      ? batches.find((batch) => batch.batchId === requestedBatchId) ?? null
      : batches[0] ?? null;
  const selectedBatchId = selectedBatch?.batchId;

  useEffect(() => {
    let shouldIgnore = false;

    setTransactions([]);
    setSelectedTransaction(null);
    setDetailError('');

    if (!selectedBatchId) {
      return;
    }

    const detailBatchId = selectedBatchId;

    async function loadTransactionDetail() {
      setIsLoadingDetail(true);

      try {
        const response =
          await transactionService.findByBatchId(detailBatchId);

        if (!shouldIgnore) {
          setTransactions(response);
          setSelectedTransaction(response[0] ?? null);
        }
      } catch {
        if (!shouldIgnore) {
          setTransactions([]);
          setDetailError(
            'No fue posible consultar el detalle individual de transacciones.',
          );
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadTransactionDetail();

    return () => {
      shouldIgnore = true;
    };
  }, [selectedBatchId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, riskFilter, selectedBatchId, sortMode]);

  const metrics = useMemo(
    () => calculateRiskMetrics(transactions, selectedBatch),
    [selectedBatch, transactions],
  );
  const chartData = useMemo(
    () => [
      { level: 'Bajo' as const, value: metrics.low },
      { level: 'Medio' as const, value: metrics.medium },
      { level: 'Alto' as const, value: metrics.high },
    ],
    [metrics.high, metrics.low, metrics.medium],
  );
  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const riskLevel = normalizeRiskLevel(
          transaction.riskResult?.riskLevel?.name,
        );
        const matchesRisk =
          riskFilter === 'Todos' || riskLevel === riskFilter;
        const searchable = [
          transaction.id,
          transaction.transactionCode,
          transaction.customerCode,
          transaction.originLocation,
          transaction.destinationLocation,
          transaction.riskResult?.observation,
          transaction.batchId,
          getActivatedRulesLabel(transaction),
        ]
          .join(' ')
          .toLowerCase();

        return matchesRisk && searchable.includes(normalizedQuery);
      })
      .sort((first, second) => {
        const direction = sortMode === 'score-desc' ? -1 : 1;

        return (
          (getScore(first) - getScore(second)) * direction ||
          first.id - second.id
        );
      });
  }, [query, riskFilter, sortMode, transactions]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pagedTransactions = filteredTransactions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleExport = () => {
    setExportMessage('');

    const exported =
      filteredTransactions.length > 0
        ? exportRowsToCsv(
            filteredTransactions.map((transaction) =>
              mapTransactionToCsvRow(transaction),
            ),
            `fraudshield-resultados-batch-${selectedBatch?.batchId ?? 'sin-datos'}.csv`,
          )
        : exportRowsToCsv(
            chartData.map((row) => ({
              batchId: selectedBatch?.batchId,
              archivo: selectedBatch?.fileName,
              fechaProcesamiento: selectedBatch?.uploadedAt,
              nivelRiesgo: row.level,
              cantidad: row.value,
            })),
            `fraudshield-resumen-batch-${selectedBatch?.batchId ?? 'sin-datos'}.csv`,
          );

    setExportMessage(
      exported
        ? 'Exportación CSV generada correctamente.'
        : 'No existen datos visibles para exportar.',
    );
  };

  return (
    <DashboardLayout>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <Message tone="error">{error}</Message>
      ) : !selectedBatch ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <BatchSummaryCard
              batch={selectedBatch}
              metrics={metrics}
              exportMessage={exportMessage}
              onExport={handleExport}
            />
            <RiskDistributionCard data={chartData} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total procesadas" value={metrics.total} />
            <SummaryCard
              label="Riesgo bajo"
              value={metrics.low}
              className="border-emerald-200 bg-emerald-50"
            />
            <SummaryCard
              label="Riesgo medio"
              value={metrics.medium}
              className="border-amber-200 bg-amber-50"
            />
            <SummaryCard
              label="Riesgo alto"
              value={metrics.high}
              className="border-red-200 bg-red-50"
            />
            <SummaryCard
              label="Score promedio"
              value={
                metrics.averageScore === null
                  ? 'N/D'
                  : `${formatNumber(metrics.averageScore)}/100`
              }
            />
          </section>

          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Tabla de resultados
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Transacciones clasificadas por FraudShield
                  </h2>
                </div>
                <ResultsFilters
                  query={query}
                  riskFilter={riskFilter}
                  sortMode={sortMode}
                  onQueryChange={setQuery}
                  onRiskFilterChange={setRiskFilter}
                  onSortModeChange={setSortMode}
                />
              </div>

              {isLoadingDetail ? (
                <DetailSkeleton />
              ) : detailError ? (
                <Message tone="warning">{detailError}</Message>
              ) : transactions.length > 0 ? (
                <>
                  <TransactionTable
                    transactions={pagedTransactions}
                    selectedTransactionId={selectedTransaction?.id}
                    onSelect={setSelectedTransaction}
                  />
                  <PaginationControls
                    page={safePage}
                    totalPages={totalPages}
                    totalRecords={filteredTransactions.length}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <Message tone="warning">
                  El lote posee resumen de procesamiento, pero no hay
                  transacciones individuales disponibles para mostrar.
                </Message>
              )}
            </div>

            <TransactionDetailPanel transaction={selectedTransaction} />
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

function BatchSummaryCard({
  batch,
  metrics,
  exportMessage,
  onExport,
}: {
  batch: HistoryRecord;
  metrics: RiskMetrics;
  exportMessage: string;
  onExport: () => void;
}) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Resumen del lote
          </p>
          <h1 className="mt-2 break-all text-2xl font-bold text-slate-950">
            {batch.fileName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Resultados calculados con datos reales persistidos en PostgreSQL.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <BatchFact label="ID del lote" value={`#${batch.batchId}`} />
        <BatchFact label="Archivo" value={batch.fileName} />
        <BatchFact
          label="Fecha"
          value={formatDate(batch.uploadedAt)}
        />
        <BatchFact
          label="Transacciones"
          value={formatNumber(metrics.total)}
        />
        <BatchFact
          label="Estado"
          value={batch.status ?? 'No disponible'}
        />
      </div>

      {exportMessage && (
        <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          {exportMessage}
        </p>
      )}
    </section>
  );
}

function RiskDistributionCard({
  data,
}: {
  data: Array<{ level: RiskLevel; value: number }>;
}) {
  const hasData = data.some((row) => row.value > 0);

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Visualización
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Distribución de riesgo
          </h2>
        </div>
        <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <FiBarChart2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {hasData ? (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="level" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
                formatter={(value) => [formatNumber(Number(value)), 'Transacciones']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.level}
                    fill={riskChartColors[entry.level]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
          Sin distribución disponible para este lote.
        </p>
      )}
    </section>
  );
}

function ResultsFilters({
  query,
  riskFilter,
  sortMode,
  onQueryChange,
  onRiskFilterChange,
  onSortModeChange,
}: {
  query: string;
  riskFilter: RiskFilter;
  sortMode: SortMode;
  onQueryChange: (value: string) => void;
  onRiskFilterChange: (value: RiskFilter) => void;
  onSortModeChange: (value: SortMode) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px_170px] lg:min-w-[620px]">
      <label className="relative block">
        <FiSearch
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar código, cliente o regla"
          className="w-full rounded-2xl border border-slate-300 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>
      <select
        value={riskFilter}
        onChange={(event) =>
          onRiskFilterChange(event.target.value as RiskFilter)
        }
        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option>Todos</option>
        <option>Bajo</option>
        <option>Medio</option>
        <option>Alto</option>
      </select>
      <select
        value={sortMode}
        onChange={(event) => onSortModeChange(event.target.value as SortMode)}
        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="score-desc">Score mayor</option>
        <option value="score-asc">Score menor</option>
      </select>
    </div>
  );
}

function TransactionTable({
  transactions,
  selectedTransactionId,
  onSelect,
}: {
  transactions: ApiTransaction[];
  selectedTransactionId?: number;
  onSelect: (transaction: ApiTransaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
        No hay transacciones que coincidan con los filtros aplicados.
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            {[
              'ID',
              'Código',
              'Cliente',
              'Monto',
              'Fecha',
              'Origen',
              'Destino',
              'Riesgo',
              'Score',
              'Reglas activadas',
              'Acción',
            ].map((column) => (
              <th
                key={column}
                className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 first:pl-0"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => {
            const riskLevel = normalizeRiskLevel(
              transaction.riskResult?.riskLevel?.name,
            );
            const isSelected = transaction.id === selectedTransactionId;

            return (
              <tr
                key={transaction.id}
                className={`align-top transition hover:bg-slate-50 ${
                  isSelected ? 'bg-blue-50/60' : ''
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2.5 pl-0 text-sm font-semibold text-slate-900">
                  #{transaction.id}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.transactionCode)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.customerCode)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-900">
                  {formatCurrencyCLP(transaction.amount)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {formatTransactionDateTime(transaction)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.originLocation)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.destinationLocation)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {riskLevel ? (
                    <RiskBadge level={riskLevel} />
                  ) : (
                    <span className="text-sm text-slate-500">
                      No disponible
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-slate-900">
                  {transaction.riskResult?.score ?? 'N/D'}
                </td>
                <td className="min-w-40 px-3 py-2.5 text-sm text-slate-700">
                  {getActivatedRulesLabel(transaction)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(transaction)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                      Detalle
                    </button>
                    <CaseAction transaction={transaction} riskLevel={riskLevel} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TransactionDetailPanel({
  transaction,
}: {
  transaction: ApiTransaction | null;
}) {
  if (!transaction) {
    return (
      <aside className="app-card rounded-[24px] p-5 lg:p-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <FiFileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-bold text-slate-950">
            Selecciona una transacción
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El detalle muestra score, clasificación, reglas R1-R5 y plan de
            acción asociado.
          </p>
        </div>
      </aside>
    );
  }

  const riskLevel = normalizeRiskLevel(transaction.riskResult?.riskLevel?.name);
  const rules = getRulesForDetail(transaction);
  const activatedRules = rules.filter((rule) => rule.activated);

  return (
    <aside className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Explicabilidad
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            ¿Por qué esta transacción fue clasificada así?
          </h2>
        </div>
        {riskLevel && <RiskBadge level={riskLevel} />}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
        <MiniMetric label="Score" value={`${transaction.riskResult?.score ?? 'N/D'}/100`} />
        <MiniMetric label="Clasificación" value={riskLevel ?? 'No disponible'} />
        <MiniMetric
          label="Plan de acción"
          value={riskLevel ? actionByRisk[riskLevel] : 'No disponible'}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-950">
          Resultado del motor
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {transaction.riskResult?.ruleDetails?.finalReason ??
            transaction.riskResult?.observation ??
            'Sin explicación disponible desde la API.'}
        </p>
        {transaction.riskResult?.ruleDetails?.algorithm && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {transaction.riskResult.ruleDetails.algorithm}
          </p>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            Reglas R1-R5
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Activadas: {activatedRules.length}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {rules.length > 0 ? (
            rules.map((rule) => (
              <RuleDetailCard key={rule.code} rule={rule} />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              La API no entregó detalle de reglas para esta transacción.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function RuleDetailCard({ rule }: { rule: RiskRuleDetail }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        rule.activated
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {rule.code} · {rule.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {rule.reason || rule.description}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            rule.activated
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {rule.activated ? 'Activada' : 'No activada'}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3 2xl:grid-cols-1">
        <RuleFact label="Condición" value={rule.condition} />
        <RuleFact label="Valor observado" value={rule.observedValue} />
        <RuleFact label="Umbral" value={rule.threshold} />
        <RuleFact
          label="Aporte al score"
          value={
            typeof rule.scoreImpact === 'number'
              ? `${formatNumber(rule.scoreImpact)} pts`
              : undefined
          }
        />
      </dl>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="space-y-4">
      <section className="app-card rounded-[24px] px-5 py-10 text-center lg:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
          <FiShield className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          Aún no hay resultados procesados
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Carga un archivo CSV para que FraudShield procese las
          transacciones, aplique las reglas R1-R5, calcule el score y muestre
          la clasificación junto con el plan de acción correspondiente.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <FiUploadCloud className="h-4 w-4" aria-hidden="true" />
          Cargar CSV
        </Link>
      </section>

      <section className="app-card rounded-[24px] p-5 lg:p-6">
        <h2 className="text-xl font-bold text-slate-950">
          ¿Cómo funciona el análisis?
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            'Carga un archivo CSV',
            'FraudShield procesa las transacciones',
            'Aplica reglas R1-R5',
            'Calcula el score',
            'Clasifica Bajo / Medio / Alto',
            'Indica el plan de acción correspondiente',
          ].map((step, index) => (
            <article
              key={step}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {step}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoRiskCard
          level="Bajo"
          title="RIESGO BAJO"
          description="Monitoreo y registro."
        />
        <InfoRiskCard
          level="Medio"
          title="RIESGO MEDIO"
          description="Requiere revisión."
        />
        <InfoRiskCard
          level="Alto"
          title="RIESGO ALTO"
          description="Revisión prioritaria."
        />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className = 'border-slate-200 bg-slate-50',
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <article
      className={`rounded-[24px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </article>
  );
}

function BatchFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value || 'No disponible'}
      </dd>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function RuleFact({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">
        {fallback(value)}
      </dd>
    </div>
  );
}

function InfoRiskCard({
  level,
  title,
  description,
}: {
  level: RiskLevel;
  title: string;
  description: string;
}) {
  return (
    <article className="app-card rounded-[24px] p-5">
      <RiskBadge level={level} />
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function CaseAction({
  transaction,
  riskLevel,
}: {
  transaction: ApiTransaction;
  riskLevel: RiskLevel | null;
}) {
  if (!riskLevel || riskLevel === 'Bajo') {
    return (
      <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
        Monitoreo
      </span>
    );
  }

  const existingCase = transaction.riskCases?.[0];
  const label = existingCase
    ? 'Ver caso'
    : riskLevel === 'Medio'
      ? 'Iniciar revisión'
      : 'Gestionar caso';

  return (
    <Link
      to={`/case-management?transactionId=${transaction.id}`}
      className="inline-flex items-center rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      {label}
    </Link>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalRecords,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        {formatNumber(totalRecords)} resultado(s) visibles · Página {page} de{' '}
        {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiArrowUp className="h-4 w-4" aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
          <FiArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${riskBadgeClasses[level]}`}
    >
      {level}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-40 rounded-[24px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-[24px]" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-[24px]" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-12 rounded-2xl"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Message({
  tone,
  children,
}: {
  tone: 'error' | 'warning';
  children: ReactNode;
}) {
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${classes}`}>
      {children}
    </p>
  );
}

function hasProcessedResults(batch: HistoryRecord) {
  return (
    (batch.totalRecords ?? 0) > 0 ||
    (batch.lowRiskCount ?? 0) > 0 ||
    (batch.mediumRiskCount ?? 0) > 0 ||
    (batch.highRiskCount ?? 0) > 0
  );
}

function calculateRiskMetrics(
  transactions: ApiTransaction[],
  batch: HistoryRecord | null,
): RiskMetrics {
  if (transactions.length > 0) {
    const scoreValues = transactions
      .map((transaction) => transaction.riskResult?.score)
      .filter((score): score is number => typeof score === 'number');

    return {
      total: transactions.length,
      low: transactions.filter((transaction) => getRisk(transaction) === 'Bajo')
        .length,
      medium: transactions.filter(
        (transaction) => getRisk(transaction) === 'Medio',
      ).length,
      high: transactions.filter((transaction) => getRisk(transaction) === 'Alto')
        .length,
      averageScore:
        scoreValues.length > 0
          ? Math.round(
              scoreValues.reduce((sum, score) => sum + score, 0) /
                scoreValues.length,
            )
          : null,
    };
  }

  return {
    total: batch?.totalRecords ?? 0,
    low: batch?.lowRiskCount ?? 0,
    medium: batch?.mediumRiskCount ?? 0,
    high: batch?.highRiskCount ?? 0,
    averageScore: null,
  };
}

function getRisk(transaction: ApiTransaction) {
  return normalizeRiskLevel(transaction.riskResult?.riskLevel?.name);
}

function normalizeRiskLevel(value?: string | null): RiskLevel | null {
  const normalized = value?.toUpperCase();

  if (normalized === 'ALTO') {
    return 'Alto';
  }

  if (normalized === 'MEDIO') {
    return 'Medio';
  }

  if (normalized === 'BAJO') {
    return 'Bajo';
  }

  return null;
}

function getScore(transaction: ApiTransaction) {
  return transaction.riskResult?.score ?? -1;
}

function getRulesForDetail(transaction: ApiTransaction) {
  const explanation = transaction.riskResult?.ruleDetails;

  return explanation?.evaluatedRules?.length
    ? explanation.evaluatedRules
    : explanation?.rules ?? [];
}

function getActivatedRulesLabel(transaction: ApiTransaction) {
  const activatedRules = getRulesForDetail(transaction)
    .filter((rule) => rule.activated)
    .map((rule) => rule.code);

  return activatedRules.length > 0 ? activatedRules.join(', ') : 'Sin reglas';
}

function fallback(value?: string | null) {
  return value && value.trim() ? value : 'No disponible';
}

function formatTransactionDateTime(transaction: ApiTransaction) {
  const date = formatDate(transaction.transactionDate);

  return transaction.transactionHour
    ? `${date} · ${transaction.transactionHour}`
    : date;
}

function mapTransactionToCsvRow(transaction: ApiTransaction) {
  return {
    id: transaction.id,
    codigo: transaction.transactionCode,
    cliente: transaction.customerCode,
    monto: transaction.amount,
    moneda: transaction.currency ?? 'CLP',
    fecha: transaction.transactionDate,
    hora: transaction.transactionHour,
    origen: transaction.originLocation,
    destino: transaction.destinationLocation,
    nivelRiesgo: transaction.riskResult?.riskLevel?.name,
    score: transaction.riskResult?.score,
    reglasActivadas: getActivatedRulesLabel(transaction),
    accion: getRisk(transaction)
      ? actionByRisk[getRisk(transaction) as RiskLevel]
      : undefined,
    observacion: transaction.riskResult?.observation,
    batchId: transaction.batchId,
  };
}

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
import { formatDate, formatNumber } from '../utils/formatDate';

type RiskFilter = RiskLevel | 'Todos';
type SortMode = 'score-desc' | 'score-asc';
type BatchStatus = 'completed' | 'unknown';

interface RiskMetrics {
  total: number;
  low: number;
  medium: number;
  high: number;
  averageScore: number | null;
}

const PAGE_SIZE = 8;
const INITIAL_BATCH_LIMIT = 6;

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
  const requestedBatchIdParam = searchParams.get('batchId');
  const [batches, setBatches] = useState<HistoryRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchQuery, setBatchQuery] = useState('');
  const [showAllBatches, setShowAllBatches] = useState(false);
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
          const completedBatches = response.filter(isCompletedBatch);
          const requestedBatchId = Number(requestedBatchIdParam);
          const requestedBatch =
            Number.isFinite(requestedBatchId) && requestedBatchId > 0
              ? completedBatches.find(
                  (batch) => batch.batchId === requestedBatchId,
                )
              : null;

          setBatches(completedBatches);
          setSelectedBatchId(
            (current) => {
              if (requestedBatch) {
                return requestedBatch.batchId;
              }

              if (
                current &&
                completedBatches.some((batch) => batch.batchId === current)
              ) {
                return current;
              }

              return completedBatches[0]?.batchId ?? null;
            },
          );
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
  }, [requestedBatchIdParam]);

  const selectedBatch =
    batches.find((batch) => batch.batchId === selectedBatchId) ?? null;

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
          transaction.transactionCode,
          transaction.customerCode,
          transaction.riskResult?.observation,
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

  const handleSelectBatch = (batchId: number) => {
    setSelectedBatchId(batchId);
    setSelectedTransaction(null);
    setRiskFilter('Todos');
    setSortMode('score-desc');
    setQuery('');
    setCurrentPage(1);
    setExportMessage('');
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
          <HeroCard
            exportMessage={exportMessage}
            onExport={handleExport}
          />

          <BatchSelector
            batches={batches}
            selectedBatchId={selectedBatch.batchId}
            query={batchQuery}
            showAll={showAllBatches}
            onQueryChange={setBatchQuery}
            onSelect={handleSelectBatch}
            onShowAll={() => setShowAllBatches(true)}
          />

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

          <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
            <RiskDistributionCard data={chartData} />

            <div className="app-card min-w-0 rounded-[24px] p-5 lg:p-6">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Transacciones del lote
                  </p>
                  <h2 className="mt-1 max-w-2xl text-lg font-bold leading-snug text-slate-950 xl:text-xl">
                    Selecciona una transacción para explicar
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
                  <TransactionSelector
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

function HeroCard({
  exportMessage,
  onExport,
}: {
  exportMessage: string;
  onExport: () => void;
}) {
  return (
    <section className="module-sticky-header app-card min-w-0 rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Resultados
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Resultados del análisis
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Consulta la clasificación, distribución del riesgo y explicación
            de las reglas aplicadas.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Exportar resultados del lote
        </button>
      </div>

      {exportMessage && (
        <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          {exportMessage}
        </p>
      )}
    </section>
  );
}

function BatchSelector({
  batches,
  selectedBatchId,
  query,
  showAll,
  onQueryChange,
  onSelect,
  onShowAll,
}: {
  batches: HistoryRecord[];
  selectedBatchId?: number;
  query: string;
  showAll: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (batchId: number) => void;
  onShowAll: () => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredBatches = batches.filter((batch) =>
    [
      batch.batchId,
      batch.fileName,
      formatDate(batch.uploadedAt),
      formatNumber(batch.totalRecords ?? 0),
      getBatchStatusLabel(batch.status),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
  const visibleBatches = showAll
    ? filteredBatches
    : filteredBatches.slice(0, INITIAL_BATCH_LIMIT);
  const hasHiddenBatches = filteredBatches.length > visibleBatches.length;

  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Lote completado
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Selecciona el lote a analizar
          </h2>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {formatNumber(batches.length)} lote(s) completado(s)
        </span>
      </div>

      <label className="relative mt-5 block">
        <FiSearch
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar lote o archivo"
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <div className="mt-4 space-y-2">
        {visibleBatches.map((batch) => {
          const isSelected = batch.batchId === selectedBatchId;

          return (
            <button
              key={batch.batchId}
              type="button"
              onClick={() => onSelect(batch.batchId)}
              className={[
                'grid w-full grid-cols-1 gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 md:grid-cols-[minmax(0,180px)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(110px,1fr)] md:items-center',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/70',
              ].join(' ')}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                  Lote #{batch.batchId}
                </p>
                <h3 className="mt-1 truncate text-sm font-bold text-slate-950">
                  {batch.fileName}
                </h3>
              </div>
              <span className="text-sm font-medium text-slate-600 sm:text-left lg:text-center">
                {formatDate(batch.uploadedAt)}
              </span>
              <span className="text-sm font-medium text-slate-600 md:text-center">
                {formatNumber(batch.totalRecords ?? 0)} transacciones
              </span>
              <span className="md:justify-self-center">
                <BatchStatusBadge status={batch.status} />
              </span>
            </button>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
          No hay lotes completados que coincidan con la búsqueda.
        </div>
      )}

      {hasHiddenBatches && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
        >
          Ver todos los lotes
        </button>
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
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_150px]">
      <label className="relative block min-w-0">
        <FiSearch
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar código, cliente o regla"
          className="w-full min-w-0 rounded-2xl border border-slate-300 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>
      <select
        value={riskFilter}
        onChange={(event) =>
          onRiskFilterChange(event.target.value as RiskFilter)
        }
        className="min-w-0 rounded-2xl border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option>Todos</option>
        <option>Bajo</option>
        <option>Medio</option>
        <option>Alto</option>
      </select>
      <select
        value={sortMode}
        onChange={(event) => onSortModeChange(event.target.value as SortMode)}
        className="min-w-0 rounded-2xl border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="score-desc">Score mayor</option>
        <option value="score-asc">Score menor</option>
      </select>
    </div>
  );
}

function TransactionSelector({
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
    <div className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full table-fixed divide-y divide-slate-200">
        <thead>
          <tr>
            <TableHeader className="w-[26%] pl-4">Código</TableHeader>
            <TableHeader className="w-[22%]">Cliente</TableHeader>
            <TableHeader className="w-[18%]">Riesgo</TableHeader>
            <TableHeader className="w-[12%]">Score</TableHeader>
            <TableHeader className="w-[22%]">Acción</TableHeader>
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
                  isSelected ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-200' : ''
                }`}
              >
                <td className="truncate px-3 py-2.5 pl-4 text-sm font-semibold text-slate-900">
                  {fallback(transaction.transactionCode)}
                </td>
                <td className="truncate px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.customerCode)}
                </td>
                <td className="px-3 py-2.5">
                  {riskLevel ? (
                    <RiskBadge level={riskLevel} />
                  ) : (
                    <span className="text-sm text-slate-500">
                      No disponible
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm font-bold text-slate-900">
                  {transaction.riskResult?.score ?? 'N/D'}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelect(transaction)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                    Analizar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function TransactionDetailPanel({
  transaction,
}: {
  transaction: ApiTransaction | null;
}) {
  if (!transaction) {
    return (
      <aside className="app-card min-w-0 rounded-[24px] p-5 lg:col-span-2 lg:p-6">
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
  const mainReason =
    transaction.riskResult?.ruleDetails?.finalReason ??
    transaction.riskResult?.observation ??
    'Sin explicación disponible desde la API.';

  return (
    <aside className="app-card min-w-0 rounded-[24px] p-5 lg:col-span-2 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Explicabilidad
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Explicación de {fallback(transaction.transactionCode)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatTransactionDateTime(transaction)}
          </p>
        </div>
        {riskLevel && <RiskBadge level={riskLevel} />}
      </div>

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric
          label="Score obtenido"
          value={`${transaction.riskResult?.score ?? 'N/D'}/100`}
        />
        <MiniMetric label="Nivel de riesgo" value={riskLevel ?? 'No disponible'} />
        <MiniMetric
          label="Reglas activadas"
          value={getActivatedRulesLabel(transaction)}
        />
        <MiniMetric
          label="Plan de acción recomendado"
          value={riskLevel ? actionByRisk[riskLevel] : 'No disponible'}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-950">
          Motivo principal
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mainReason}
        </p>
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
          El nivel se determina según la regla activa de mayor prioridad; los
          puntajes no se suman.
        </p>
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

        <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
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
  const display = getRuleDisplay(rule);

  return (
    <details
      open={rule.activated}
      className={`rounded-2xl border p-4 ${
        rule.activated
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {rule.code} · {display.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {display.description}
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
      </summary>

      <div className="mt-3 rounded-2xl border border-white/70 bg-white/80 p-3 text-sm leading-6 text-slate-700">
        {display.explanation}
      </div>

      <details className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold text-slate-600">
          Ver criterio técnico
        </summary>
        <dl className="mt-3 grid gap-2 text-xs text-slate-600">
          <RuleFact label="Condición" value={rule.condition} />
          <RuleFact label="Valor observado" value={rule.observedValue} />
          <RuleFact label="Umbral" value={rule.threshold} />
          <RuleFact
            label="Puntaje de referencia"
            value={
              typeof rule.scoreImpact === 'number'
                ? `${formatNumber(rule.scoreImpact)} pts`
                : undefined
            }
          />
        </dl>
      </details>
    </details>
  );
}

function getRuleDisplay(rule: RiskRuleDetail) {
  const code = rule.code.toUpperCase();
  const defaults = {
    name: rule.name,
    description: rule.reason || rule.description,
    explanation: describeCondition(rule),
  };

  const descriptions: Record<
    string,
    { name: string; description: string; explanation: string }
  > = {
    R1: {
      name: 'Monto superior',
      description: 'Monto superior a $500.000 CLP.',
      explanation:
        'La transacción supera el monto definido como señal de revisión.',
    },
    R2: {
      name: 'Horario nocturno',
      description: 'Transacción realizada entre las 00:00 y las 05:59.',
      explanation:
        'La operación ocurrió en una franja horaria de mayor atención.',
    },
    R3: {
      name: 'Frecuencia elevada',
      description:
        'El cliente registra varias transacciones cercanas en el tiempo.',
      explanation:
        'La actividad reciente del cliente supera el patrón esperado para revisión.',
    },
    R4: {
      name: 'Cambio de ubicación',
      description:
        'Cambio de ubicación entre transacciones cercanas del mismo cliente.',
      explanation:
        'Se detecta variación de ubicación en operaciones cercanas del mismo cliente.',
    },
    R5: {
      name: 'Sin señales de riesgo relevantes',
      description:
        'Se utiliza cuando no se activan R1-R4.',
      explanation:
        'La transacción queda en riesgo bajo porque no presenta señales relevantes en las reglas prioritarias.',
    },
  };

  return descriptions[code] ?? defaults;
}

function describeCondition(rule: RiskRuleDetail) {
  const condition = String(rule.condition ?? '').trim();

  if (condition === 'amount > 500000') {
    return 'Monto superior a $500.000 CLP.';
  }

  if (condition === 'hour >= 0 && hour <= 5') {
    return 'Transacción realizada entre las 00:00 y las 05:59.';
  }

  if (condition) {
    return rule.reason || rule.description || condition;
  }

  return rule.reason || rule.description || 'Criterio no informado por la API.';
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
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
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

function isCompletedBatch(batch: HistoryRecord) {
  return getBatchStatus(batch.status) === 'completed';
}

function getBatchStatus(value?: string | null): BatchStatus {
  const normalized = String(value ?? '').trim().toUpperCase();

  return ['COMPLETED', 'COMPLETADO', 'COMPLETE', 'SUCCESS', 'SUCCESSFUL'].includes(
    normalized,
  )
    ? 'completed'
    : 'unknown';
}

function getBatchStatusLabel(value?: string | null) {
  return getBatchStatus(value) === 'completed' ? 'Completado' : fallback(value);
}

function BatchStatusBadge({ status }: { status?: string | null }) {
  return (
    <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
      {getBatchStatusLabel(status)}
    </span>
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
  const date = formatTransactionDate(transaction.transactionDate);
  const time = formatTransactionHour(transaction.transactionHour);

  return time ? `${date} · ${time}` : date;
}

function formatTransactionDate(value?: string | null) {
  const datePart = String(value ?? '').trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (match) {
    const [, year, month, day] = match;

    return `${day}-${month}-${year}`;
  }

  return fallback(value);
}

function formatTransactionHour(value?: string | null) {
  const time = String(value ?? '').trim();
  const match = /^(\d{2}):(\d{2})(?::\d{2})?/.exec(time);

  if (match) {
    const [, hour, minute] = match;

    return `${hour}:${minute}`;
  }

  return time;
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

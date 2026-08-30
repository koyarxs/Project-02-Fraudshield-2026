import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FiBriefcase,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiSearch,
  FiShield,
  FiUploadCloud,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  DetailBadge,
  DetailField,
  DetailGrid,
  DetailNote,
  DetailPanel,
  DetailSection,
} from '../components/ui/DetailPanel';
import { historyService } from '../services/history.service';
import transactionService from '../services/transaction.service';
import type { HistoryRecord } from '../types/history';
import type { ApiTransaction, RiskRuleDetail } from '../types/transaction';
import type { RiskLevel } from '../types/processing';
import { exportRowsToCsv } from '../utils/exportCsv';
import {
  formatCurrencyCLP,
  formatDate,
  formatNumber,
} from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';

type RiskFilter = RiskLevel | 'Todos';
type SortMode = 'score-desc' | 'score-asc' | 'amount-desc' | 'amount-asc';
type BatchStatus = 'completed' | 'failed' | 'pending' | 'unknown';

interface FiltersState {
  query: string;
  risk: RiskFilter;
  scoreMin: string;
  scoreMax: string;
  origin: string;
  destination: string;
  date: string;
}

interface Metrics {
  total: number;
  low: number;
  medium: number;
  high: number;
  averageScore: number | null;
}

const PAGE_SIZE = 10;
const INITIAL_BATCH_LIMIT = 6;

const initialFilters: FiltersState = {
  query: '',
  risk: 'Todos',
  scoreMin: '',
  scoreMax: '',
  origin: '',
  destination: '',
  date: '',
};

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

export default function Transactions() {
  const { user } = useAuth();
  const canCreateCases = user?.role === 'ADMINISTRADOR';
  const navigate = useNavigate();
  const [batches, setBatches] = useState<HistoryRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchQuery, setBatchQuery] = useState('');
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ApiTransaction | null>(null);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [sortMode, setSortMode] = useState<SortMode>('score-desc');
  const [page, setPage] = useState(1);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    let shouldIgnore = false;

    async function loadBatches() {
      setIsLoadingBatches(true);
      setError('');

      try {
        const response = await historyService.findAll();
        const apiBatches = response.filter(
          (batch) => batch.source === 'api',
        );

        if (!shouldIgnore) {
          setBatches(apiBatches);
          setSelectedBatchId((current) =>
            current && apiBatches.some((batch) => batch.batchId === current)
              ? current
              : (apiBatches.find(canShowBatchResults) ?? apiBatches[0])
                  ?.batchId ?? null,
          );
        }
      } catch {
        if (!shouldIgnore) {
          setBatches([]);
          setError('No fue posible consultar los lotes procesados.');
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingBatches(false);
        }
      }
    }

    void loadBatches();

    return () => {
      shouldIgnore = true;
    };
  }, []);

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

    if (selectedBatch && !canShowBatchResults(selectedBatch)) {
      setDetailError(
        'Este lote no está completado o no posee transacciones disponibles para consultar.',
      );
      return;
    }

    const batchId = selectedBatchId;

    async function loadTransactions() {
      setIsLoadingTransactions(true);

      try {
        const response = await transactionService.findByBatchId(batchId);

        if (!shouldIgnore) {
          setTransactions(response);
        }
      } catch {
        if (!shouldIgnore) {
          setTransactions([]);
          setDetailError(
            'No fue posible consultar las transacciones del lote seleccionado.',
          );
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingTransactions(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      shouldIgnore = true;
    };
  }, [selectedBatch, selectedBatchId]);

  useEffect(() => {
    setPage(1);
    setExportMessage('');
  }, [filters, selectedBatchId, sortMode]);

  const metrics = useMemo(
    () => calculateMetrics(transactions, selectedBatch),
    [selectedBatch, transactions],
  );
  const distribution = useMemo(
    () => [
      { level: 'Bajo' as const, value: metrics.low },
      { level: 'Medio' as const, value: metrics.medium },
      { level: 'Alto' as const, value: metrics.high },
    ],
    [metrics.high, metrics.low, metrics.medium],
  );
  const topRules = useMemo(
    () => calculateRuleActivations(transactions),
    [transactions],
  );
  const filteredTransactions = useMemo(
    () => filterAndSortTransactions(transactions, filters, sortMode),
    [filters, sortMode, transactions],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedBatchCanShowResults = Boolean(
    selectedBatch && canShowBatchResults(selectedBatch),
  );
  const canExportSelectedBatch = Boolean(
    selectedBatchCanShowResults && transactions.length > 0,
  );

  const handleSelectBatch = (batchId: number) => {
    setSelectedBatchId(batchId);
    setFilters(initialFilters);
    setSortMode('score-desc');
    setPage(1);
    setExportMessage('');
    setSelectedTransaction(null);
  };

  const handleExport = () => {
    setExportMessage('');

    if (!selectedBatch || !canShowBatchResults(selectedBatch)) {
      setExportMessage(
        'Selecciona un lote completado para exportar sus transacciones.',
      );
      return;
    }

    const exported = exportRowsToCsv(
      filteredTransactions.map((transaction) =>
        mapTransactionToCsvRow(transaction, selectedBatch),
      ),
      `fraudshield_transacciones_lote_${selectedBatch?.batchId ?? 'sin_lote'}.csv`,
    );

    setExportMessage(
      exported
        ? 'Archivo CSV exportado con los datos visibles.'
        : 'No existen datos visibles para exportar.',
    );
  };

  return (
    <DashboardLayout>
      {isLoadingBatches ? (
        <LoadingState />
      ) : error ? (
        <Message tone="error">{error}</Message>
      ) : batches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <HeroCard
            exportMessage={exportMessage}
            onExport={handleExport}
            canExport={canExportSelectedBatch}
          />

          <BatchSelector
            batches={batches}
            selectedBatchId={selectedBatch?.batchId}
            query={batchQuery}
            showAll={showAllBatches}
            onQueryChange={setBatchQuery}
            onSelect={handleSelectBatch}
            onShowAll={() => setShowAllBatches(true)}
          />

          {selectedBatch && !selectedBatchCanShowResults && (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <BatchSummary batch={selectedBatch} />
              <div className="app-card flex items-center rounded-[24px] p-5">
                <Message tone="warning">
                  {getBatchStatusLabel(selectedBatch.status)}: este lote no
                  tiene resultados disponibles para consultar.
                </Message>
              </div>
            </section>
          )}

          {selectedBatch && selectedBatchCanShowResults && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard label="Total de transacciones" value={metrics.total} />
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

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <BatchSummary batch={selectedBatch} />
                <VisualSummary
                  distribution={distribution}
                  rules={topRules}
                />
              </section>

              <section className="app-card rounded-[24px] p-5 lg:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                      Consulta operacional
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                      Tabla principal de transacciones
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatNumber(filteredTransactions.length)} resultado(s)
                      visibles del lote #{selectedBatch.batchId}
                    </p>
                  </div>
                  <FiltersPanel
                    filters={filters}
                    sortMode={sortMode}
                    onFiltersChange={setFilters}
                    onSortModeChange={setSortMode}
                    onClear={() => setFilters(initialFilters)}
                  />
                </div>

                {detailError && (
                  <Message tone="warning">{detailError}</Message>
                )}

                {isLoadingTransactions ? (
                  <RowsSkeleton />
                ) : transactions.length === 0 ? (
                  <Message tone="warning">
                    El lote fue encontrado, pero no hay transacciones
                    individuales disponibles desde la API.
                  </Message>
                ) : (
                  <>
                    <TransactionsTable
                      transactions={visibleTransactions}
                      onSelectTransaction={setSelectedTransaction}
                      onManageCase={(transaction) =>
                        navigate(
                          `/case-management?transactionId=${transaction.id}`,
                        )
                      }
                      canCreateCases={canCreateCases}
                    />
                    <MobileTransactionCards
                      transactions={visibleTransactions}
                      onSelectTransaction={setSelectedTransaction}
                      onManageCase={(transaction) =>
                        navigate(
                          `/case-management?transactionId=${transaction.id}`,
                        )
                      }
                      canCreateCases={canCreateCases}
                    />
                    <PaginationControls
                      page={currentPage}
                      totalPages={totalPages}
                      totalRecords={filteredTransactions.length}
                      onPageChange={setPage}
                    />
                  </>
                )}
              </section>
            </>
          )}
        </div>
      )}

      <TransactionDetailModal
        transaction={selectedTransaction}
        batch={selectedBatch}
        onClose={() => setSelectedTransaction(null)}
        onManageCase={(transaction) =>
          navigate(`/case-management?transactionId=${transaction.id}`)
        }
        canCreateCases={canCreateCases}
      />
    </DashboardLayout>
  );
}

function HeroCard({
  exportMessage,
  onExport,
  canExport,
}: {
  exportMessage: string;
  onExport: () => void;
  canExport: boolean;
}) {
  return (
    <section className="module-sticky-header app-card rounded-[24px] p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Transacciones
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Transacciones procesadas
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Selecciona un lote para revisar sus transacciones, clasificación,
            score, reglas activadas y casos asociados.
          </p>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none"
        >
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Exportar lote seleccionado
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
      getBatchStatusLabel(batch.status),
      formatDate(batch.uploadedAt),
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
            Selector de lote
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Lotes disponibles
          </h2>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {formatNumber(batches.length)} lote(s)
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
          placeholder="Buscar lote, archivo o estado"
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <div className="mt-4 space-y-2">
        {visibleBatches.map((batch) => {
          const isSelected = batch.batchId === selectedBatchId;
          const status = getBatchStatus(batch.status);

          return (
            <button
              key={batch.batchId}
              type="button"
              onClick={() => onSelect(batch.batchId)}
              className={[
                'flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 lg:flex-row lg:items-center lg:justify-between',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
                  : status === 'failed'
                    ? 'border-red-200 bg-red-50/70 hover:border-red-300'
                    : status === 'pending'
                      ? 'border-amber-200 bg-amber-50/70 hover:border-amber-300'
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
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 lg:min-w-[520px]">
                <span>{formatDate(batch.uploadedAt)}</span>
                <span>{formatNumber(batch.totalRecords ?? 0)} registros</span>
                <BatchStatusBadge status={batch.status} />
              </div>
            </button>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
          No hay lotes que coincidan con la búsqueda.
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

function BatchSummary({ batch }: { batch: HistoryRecord }) {
  return (
    <section className="app-card rounded-[24px] p-4 lg:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
        Resumen visual del lote
      </p>
      <h2 className="mt-1 break-all text-xl font-bold text-slate-950">
        Lote #{batch.batchId} · {batch.fileName}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Registros" value={formatNumber(batch.totalRecords ?? 0)} />
        <Fact label="Archivo" value={batch.fileName} />
        <Fact label="Fecha" value={formatDate(batch.uploadedAt)} />
        <Fact label="Estado" value={<BatchStatusBadge status={batch.status} />} />
      </div>
    </section>
  );
}

function VisualSummary({
  distribution,
  rules,
}: {
  distribution: Array<{ level: RiskLevel; value: number }>;
  rules: Array<{ code: string; name: string; count: number }>;
}) {
  return (
    <section className="app-card rounded-[24px] p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Distribución
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Bajo / Medio / Alto
          </h2>
        </div>
        <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <FiBarChart2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 12, right: 6, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="level" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
              formatter={(value) => [
                formatNumber(Number(value)),
                'Transacciones',
              ]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {distribution.map((entry) => (
                <Cell
                  key={entry.level}
                  fill={riskChartColors[entry.level]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 border-t border-slate-200 pt-3">
        <h3 className="text-sm font-bold text-slate-950">
          Reglas más activadas del lote
        </h3>
        <div className="mt-2 space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.code}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-800">
                {rule.code} · {rule.name}
              </span>
              <span className="font-bold text-slate-950">
                {formatNumber(rule.count)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FiltersPanel({
  filters,
  sortMode,
  onFiltersChange,
  onSortModeChange,
  onClear,
}: {
  filters: FiltersState;
  sortMode: SortMode;
  onFiltersChange: (filters: FiltersState) => void;
  onSortModeChange: (mode: SortMode) => void;
  onClear: () => void;
}) {
  return (
    <div className="w-full xl:max-w-5xl">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_180px_150px]">
        <label className="relative block md:col-span-2">
          <FiSearch
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
            placeholder="Buscar código, cliente o reglas"
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <select
          value={filters.risk}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              risk: event.target.value as RiskFilter,
            })
          }
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option>Todos</option>
          <option>Bajo</option>
          <option>Medio</option>
          <option>Alto</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as SortMode)}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="score-desc">Score mayor</option>
          <option value="score-asc">Score menor</option>
          <option value="amount-desc">Monto mayor</option>
          <option value="amount-asc">Monto menor</option>
        </select>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
        >
          <FiFilter className="h-4 w-4" aria-hidden="true" />
          Limpiar filtros
        </button>
      </div>

      <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">
          Más filtros
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={filters.scoreMin}
            onChange={(event) =>
              onFiltersChange({ ...filters, scoreMin: event.target.value })
            }
            inputMode="numeric"
            placeholder="Score mínimo"
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <input
            value={filters.scoreMax}
            onChange={(event) =>
              onFiltersChange({ ...filters, scoreMax: event.target.value })
            }
            inputMode="numeric"
            placeholder="Score máximo"
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <input
            value={filters.origin}
            onChange={(event) =>
              onFiltersChange({ ...filters, origin: event.target.value })
            }
            placeholder="Origen"
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <input
            value={filters.destination}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                destination: event.target.value,
              })
            }
            placeholder="Destino"
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <input
            type="date"
            value={filters.date}
            onChange={(event) =>
              onFiltersChange({ ...filters, date: event.target.value })
            }
            className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </details>
    </div>
  );
}

function TransactionsTable({
  transactions,
  onSelectTransaction,
  onManageCase,
  canCreateCases,
}: {
  transactions: ApiTransaction[];
  onSelectTransaction: (transaction: ApiTransaction) => void;
  onManageCase: (transaction: ApiTransaction) => void;
  canCreateCases: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
        No hay transacciones que coincidan con los filtros aplicados.
      </div>
    );
  }

  return (
    <div className="mt-5 hidden rounded-2xl border border-slate-200 md:block">
      <table className="w-full table-fixed divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            <TableHeader className="w-[11%] pl-4">Código</TableHeader>
            <TableHeader className="w-[10%]">Cliente</TableHeader>
            <TableHeader className="w-[10%]">Monto</TableHeader>
            <TableHeader className="w-[12%]">Fecha/Hora</TableHeader>
            <TableHeader className="w-[15%]">Ruta</TableHeader>
            <TableHeader className="w-[8%]">Riesgo</TableHeader>
            <TableHeader className="w-[7%]">Score</TableHeader>
            <TableHeader className="w-[8%]">Reglas</TableHeader>
            <TableHeader className="w-[10%]">Estado/Caso</TableHeader>
            <TableHeader className="w-[9%]">Acciones</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => {
            const riskLevel = getRisk(transaction);

            return (
              <tr
                key={transaction.id}
                className="align-top transition hover:bg-blue-50/50"
              >
                <td className="px-3 py-2.5 pl-4 text-sm font-semibold text-slate-800">
                  {fallback(transaction.transactionCode)}
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  {fallback(transaction.customerCode)}
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold text-slate-950">
                  {formatCurrencyCLP(transaction.amount)}
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  {formatTransactionDateTime(transaction)}
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  <RouteLabel transaction={transaction} />
                </td>
                <td className="px-3 py-2.5">
                  {riskLevel ? (
                    <RiskBadge level={riskLevel} />
                  ) : (
                    <span className="text-sm text-slate-500">N/D</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm font-bold text-slate-950">
                  {transaction.riskResult?.score ?? 'N/D'}
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  {getActivatedRulesLabel(transaction)}
                </td>
                <td className="px-3 py-2.5">
                  <CaseStatusBadge transaction={transaction} riskLevel={riskLevel} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectTransaction(transaction)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                      Ver detalle
                    </button>
                    <CaseAction
                      transaction={transaction}
                      riskLevel={riskLevel}
                      onManageCase={onManageCase}
                      canCreateCases={canCreateCases}
                    />
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

function MobileTransactionCards({
  transactions,
  onSelectTransaction,
  onManageCase,
  canCreateCases,
}: {
  transactions: ApiTransaction[];
  onSelectTransaction: (transaction: ApiTransaction) => void;
  onManageCase: (transaction: ApiTransaction) => void;
  canCreateCases: boolean;
}) {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 space-y-3 md:hidden">
      {transactions.map((transaction) => {
        const riskLevel = getRisk(transaction);

        return (
          <article
            key={transaction.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Código
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-950">
                  {fallback(transaction.transactionCode)}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Cliente {fallback(transaction.customerCode)}
                </p>
              </div>
              {riskLevel && <RiskBadge level={riskLevel} />}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Fact label="Monto" value={formatCurrencyCLP(transaction.amount)} />
              <Fact
                label="Fecha/hora"
                value={formatTransactionDateTime(transaction)}
              />
              <Fact label="Score" value={transaction.riskResult?.score ?? 'N/D'} />
              <Fact label="Estado/Caso" value={<CaseStatusBadge transaction={transaction} riskLevel={riskLevel} />} />
              <Fact label="Ruta" value={<RouteLabel transaction={transaction} />} />
              <Fact label="Reglas" value={getActivatedRulesLabel(transaction)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectTransaction(transaction)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
              >
                <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                Ver detalle
              </button>
              <CaseAction
                transaction={transaction}
                riskLevel={riskLevel}
                onManageCase={onManageCase}
                canCreateCases={canCreateCases}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  batch,
  onClose,
  onManageCase,
  canCreateCases,
}: {
  transaction: ApiTransaction | null;
  batch: HistoryRecord | null;
  onClose: () => void;
  onManageCase: (transaction: ApiTransaction) => void;
  canCreateCases: boolean;
}) {
  if (!transaction) {
    return null;
  }

  const riskLevel = getRisk(transaction);
  const activeRules = getActiveRules(transaction);
  const associatedCase = transaction.riskCases?.[0];
  const canManageCase = Boolean(
    associatedCase ||
      (canCreateCases && riskLevel && riskLevel !== 'Bajo'),
  );

  return (
    <DetailPanel
      icon={<FiFileText className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Detalle de transacción"
      title={fallback(transaction.transactionCode)}
      badge={
        <DetailBadge tone={getTransactionDetailTone(riskLevel)}>
          {riskLevel ? `Riesgo ${riskLevel}` : 'Sin clasificación'}
        </DetailBadge>
      }
      meta={`${formatTransactionDateTime(transaction)} · Lote #${transaction.batchId}`}
      onClose={onClose}
      footer={
        canManageCase ? (
          <button
            type="button"
            onClick={() => onManageCase(transaction)}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {associatedCase ? 'Gestionar caso' : 'Crear caso'}
          </button>
        ) : undefined
      }
    >
      <DetailSection title="Resumen" tone={getTransactionDetailTone(riskLevel)}>
        <DetailGrid>
          <DetailField label="Cliente" value={transaction.customerCode} />
          <DetailField
            label="Monto"
            value={formatCurrencyCLP(transaction.amount)}
          />
          <DetailField
            label="Nivel de riesgo"
            value={riskLevel ?? 'No disponible'}
          />
          <DetailField
            label="Score"
            value={`${transaction.riskResult?.score ?? 'N/D'}/100`}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Identificación">
        <DetailGrid>
          <DetailField label="Código" value={transaction.transactionCode} />
          <DetailField label="ID interno" value={`#${transaction.id}`} />
          <DetailField label="Lote" value={`#${transaction.batchId}`} />
          <DetailField
            label="Archivo"
            value={batch?.fileName ?? 'No disponible'}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Información operacional">
        <DetailGrid>
          <DetailField
            label="Fecha y hora"
            value={formatTransactionDateTime(transaction)}
          />
          <DetailField
            label="Origen"
            value={fallback(transaction.originLocation)}
          />
          <DetailField
            label="Destino"
            value={fallback(transaction.destinationLocation)}
          />
          <DetailField
            label="Plan de acción"
            value={riskLevel ? actionByRisk[riskLevel] : 'No disponible'}
            wide
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Explicación del riesgo" tone="blue">
        <p className="break-words text-sm leading-6 text-blue-950">
          {transaction.riskResult?.ruleDetails?.finalReason ??
            transaction.riskResult?.observation ??
            'Sin explicación disponible desde la API.'}
        </p>
        {transaction.riskResult?.ruleDetails?.algorithm ? (
          <details className="mt-3 rounded-xl border border-blue-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-bold text-blue-800">
              Ver detalle técnico
            </summary>
            <p className="mt-2 break-words text-xs leading-5 text-slate-600">
              {transaction.riskResult.ruleDetails.algorithm}
            </p>
          </details>
        ) : null}
      </DetailSection>

      <DetailSection
        title="Reglas activadas R1-R5"
        description={`${activeRules.length} regla(s) activa(s)`}
      >
        {activeRules.length > 0 ? (
          <div className="space-y-3">
            {activeRules.map((rule) => (
              <RuleCard key={rule.code} rule={rule} />
            ))}
          </div>
        ) : (
          <DetailNote>
            No hay reglas activadas informadas para esta transacción.
          </DetailNote>
        )}
      </DetailSection>

      <DetailSection title="Detalle completo o trazabilidad">
        {associatedCase ? (
          <DetailGrid>
            <DetailField label="Caso" value={`#${associatedCase.id}`} />
            <DetailField
              label="Estado"
              value={formatCaseStatus(associatedCase.status)}
            />
            <DetailField label="Prioridad" value={associatedCase.priority} />
            <DetailField
              label="Responsable"
              value={
                associatedCase.responsibleUser?.name ??
                associatedCase.responsibleName ??
                'Sin asignar'
              }
            />
          </DetailGrid>
        ) : (
          <DetailNote>
            Esta transacción aún no posee un caso asociado.
          </DetailNote>
        )}
      </DetailSection>
    </DetailPanel>
  );
}

function getTransactionDetailTone(riskLevel?: RiskLevel | null) {
  if (riskLevel === 'Alto') return 'red' as const;
  if (riskLevel === 'Medio') return 'amber' as const;
  if (riskLevel === 'Bajo') return 'emerald' as const;
  return 'slate' as const;
}

function RuleCard({ rule }: { rule: RiskRuleDetail }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {rule.code} · {rule.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {rule.reason || rule.description}
          </p>
        </div>
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
          +{formatNumber(rule.scoreImpact)} pts
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <Fact label="Condición" value={fallback(rule.condition)} />
        <Fact label="Valor observado" value={fallback(rule.observedValue)} />
        <Fact label="Umbral" value={fallback(rule.threshold)} />
      </dl>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="space-y-4">
      <section className="app-card rounded-[24px] px-5 py-10 text-center lg:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
          <FiFileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          Aún no hay transacciones procesadas
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Carga un archivo CSV para que FraudShield procese los registros,
          aplique R1-R5 y permita consultar cada transacción individual con
          su score, nivel de riesgo y trazabilidad.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <FiUploadCloud className="h-4 w-4" aria-hidden="true" />
          Cargar CSV
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={<FiBriefcase className="h-5 w-5" aria-hidden="true" />}
          title="LOTES"
          description="Agrupan las transacciones procesadas."
        />
        <InfoCard
          icon={<FiFileText className="h-5 w-5" aria-hidden="true" />}
          title="TRANSACCIONES"
          description="Permiten consultar cada registro individual."
        />
        <InfoCard
          icon={<FiShield className="h-5 w-5" aria-hidden="true" />}
          title="RIESGO"
          description="Cada transacción puede contener score, nivel y reglas activadas."
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

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="app-card rounded-[24px] p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value || 'No disponible'}
      </dd>
    </div>
  );
}

function CaseStatusBadge({
  transaction,
}: {
  transaction: ApiTransaction;
  riskLevel: RiskLevel | null;
}) {
  const existingCase = transaction.riskCases?.[0];

  if (existingCase) {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
        Caso #{existingCase.id} · {formatCaseStatus(existingCase.status)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      Sin caso
    </span>
  );
}

function CaseAction({
  transaction,
  riskLevel,
  onManageCase,
  canCreateCases,
}: {
  transaction: ApiTransaction;
  riskLevel: RiskLevel | null;
  onManageCase: (transaction: ApiTransaction) => void;
  canCreateCases: boolean;
}) {
  const existingCase = transaction.riskCases?.[0];

  if (
    !existingCase &&
    (!canCreateCases || !riskLevel || riskLevel === 'Bajo')
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onManageCase(transaction)}
      className="inline-flex items-center rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      Gestionar caso
    </button>
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

function RouteLabel({ transaction }: { transaction: ApiTransaction }) {
  return (
    <span className="block min-w-0 text-xs leading-5 text-slate-600">
      <span className="block truncate font-semibold text-slate-800">
        {fallback(transaction.originLocation)}
      </span>
      <span className="block truncate">
        hacia {fallback(transaction.destinationLocation)}
      </span>
    </span>
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
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

function RowsSkeleton() {
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

function canShowBatchResults(batch: HistoryRecord) {
  return (
    getBatchStatus(batch.status) === 'completed' &&
    (batch.totalRecords ?? 0) > 0
  );
}

function getBatchStatus(value?: string | null): BatchStatus {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (
    ['COMPLETED', 'COMPLETADO', 'COMPLETE', 'SUCCESS', 'SUCCESSFUL'].includes(
      normalized,
    )
  ) {
    return 'completed';
  }

  if (
    ['FAILED', 'FALLIDO', 'ERROR', 'ERROR_PROCESSING'].includes(normalized) ||
    normalized.includes('FALL')
  ) {
    return 'failed';
  }

  if (
    ['PENDING', 'PENDIENTE', 'PROCESSING', 'EN_PROCESO'].includes(normalized)
  ) {
    return 'pending';
  }

  return 'unknown';
}

function getBatchStatusLabel(value?: string | null) {
  const labels: Record<BatchStatus, string> = {
    completed: 'Completado',
    failed: 'Fallido',
    pending: 'Pendiente',
    unknown: fallback(value),
  };

  return labels[getBatchStatus(value)];
}

function BatchStatusBadge({ status }: { status?: string | null }) {
  const normalizedStatus = getBatchStatus(status);
  const classes: Record<BatchStatus, string> = {
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    failed: 'bg-red-50 text-red-700 ring-red-100',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[normalizedStatus]}`}
    >
      {getBatchStatusLabel(status)}
    </span>
  );
}

function calculateMetrics(
  transactions: ApiTransaction[],
  batch: HistoryRecord | null,
): Metrics {
  if (transactions.length > 0) {
    const scores = transactions
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
        scores.length > 0
          ? Math.round(
              scores.reduce((sum, score) => sum + score, 0) / scores.length,
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

function calculateRuleActivations(transactions: ApiTransaction[]) {
  const totals = new Map<string, { code: string; name: string; count: number }>();

  for (const code of ['R1', 'R2', 'R3', 'R4', 'R5']) {
    totals.set(code, { code, name: getRuleName(code), count: 0 });
  }

  for (const transaction of transactions) {
    for (const rule of getActiveRules(transaction)) {
      const current = totals.get(rule.code) ?? {
        code: rule.code,
        name: rule.name,
        count: 0,
      };

      totals.set(rule.code, {
        ...current,
        name: rule.name || current.name,
        count: current.count + 1,
      });
    }
  }

  return Array.from(totals.values()).sort(
    (first, second) => second.count - first.count || first.code.localeCompare(second.code),
  );
}

function filterAndSortTransactions(
  transactions: ApiTransaction[],
  filters: FiltersState,
  sortMode: SortMode,
) {
  const query = filters.query.trim().toLowerCase();
  const origin = filters.origin.trim().toLowerCase();
  const destination = filters.destination.trim().toLowerCase();
  const scoreMin = Number(filters.scoreMin);
  const scoreMax = Number(filters.scoreMax);
  const hasScoreMin = filters.scoreMin.trim() !== '' && !Number.isNaN(scoreMin);
  const hasScoreMax = filters.scoreMax.trim() !== '' && !Number.isNaN(scoreMax);

  return transactions
    .filter((transaction) => {
      const risk = getRisk(transaction);
      const score = transaction.riskResult?.score;
      const searchable = [
        transaction.transactionCode,
        transaction.customerCode,
        getActivatedRulesLabel(transaction),
      ]
        .join(' ')
        .toLowerCase();
      const transactionDate = transaction.transactionDate?.slice(0, 10);

      return (
        (filters.risk === 'Todos' || risk === filters.risk) &&
        searchable.includes(query) &&
        (!hasScoreMin || (typeof score === 'number' && score >= scoreMin)) &&
        (!hasScoreMax || (typeof score === 'number' && score <= scoreMax)) &&
        (origin === '' ||
          String(transaction.originLocation ?? '').toLowerCase().includes(origin)) &&
        (destination === '' ||
          String(transaction.destinationLocation ?? '')
            .toLowerCase()
            .includes(destination)) &&
        (!filters.date || transactionDate === filters.date)
      );
    })
    .sort((first, second) => {
      if (sortMode === 'amount-desc' || sortMode === 'amount-asc') {
        const direction = sortMode === 'amount-desc' ? -1 : 1;

        return (
          (Number(first.amount) - Number(second.amount)) * direction ||
          first.id - second.id
        );
      }

      const direction = sortMode === 'score-desc' ? -1 : 1;

      return (
        ((first.riskResult?.score ?? -1) - (second.riskResult?.score ?? -1)) *
          direction ||
        first.id - second.id
      );
    });
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

function getRules(transaction: ApiTransaction) {
  const explanation = transaction.riskResult?.ruleDetails;

  return explanation?.evaluatedRules?.length
    ? explanation.evaluatedRules
    : explanation?.rules ?? [];
}

function getActiveRules(transaction: ApiTransaction) {
  return getRules(transaction).filter((rule) => rule.activated);
}

function getActivatedRulesLabel(transaction: ApiTransaction) {
  const rules = getActiveRules(transaction).map((rule) => rule.code);

  return rules.length > 0 ? rules.join(', ') : 'Sin reglas';
}

function fallback(value?: string | number | null) {
  const text = String(value ?? '').trim();

  return text || 'No disponible';
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

function formatCaseStatus(value?: string | null) {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revisión',
    RESUELTO: 'Resuelto',
  };

  return value ? labels[value] ?? value : 'No disponible';
}

function getRuleName(code: string) {
  const names: Record<string, string> = {
    R1: 'Monto superior',
    R2: 'Horario nocturno',
    R3: 'Frecuencia elevada',
    R4: 'Ubicaciones distintas',
    R5: 'Sin condiciones relevantes',
  };

  return names[code] ?? code;
}

function mapTransactionToCsvRow(
  transaction: ApiTransaction,
  batch: HistoryRecord | null,
) {
  const risk = getRisk(transaction);

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
    riesgo: risk,
    score: transaction.riskResult?.score,
    reglas: getActivatedRulesLabel(transaction),
    accion: risk ? actionByRisk[risk] : undefined,
    caso: transaction.riskCases?.[0]?.id,
    lote: batch?.batchId ?? transaction.batchId,
    archivo: batch?.fileName,
  };
}

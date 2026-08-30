import axios from 'axios';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArchive,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi';
import HistoryStatusBadge from '../components/history/HistoryStatusBadge';
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
import type { HistoryRecord, HistoryRisk } from '../types/history';
import { exportRowsToCsv } from '../utils/exportCsv';
import { formatDate, formatFileSize, formatNumber } from '../utils/formatDate';

type LoadState = 'loading' | 'ready' | 'error' | 'api-unavailable' | 'expired';
type SortKey =
  | 'uploadedAt'
  | 'fileName'
  | 'totalRecords'
  | 'highRiskCount'
  | 'mediumRiskCount'
  | 'lowRiskCount';
type SortDirection = 'asc' | 'desc';

interface HistoryFiltersState {
  query: string;
  status: string;
  dominantRisk: '' | HistoryRisk;
  dateFrom: string;
  dateTo: string;
}

const emptyFilters: HistoryFiltersState = {
  query: '',
  status: '',
  dominantRisk: '',
  dateFrom: '',
  dateTo: '',
};

const sortOptions: Array<{ label: string; value: SortKey }> = [
  { label: 'Fecha', value: 'uploadedAt' },
  { label: 'Nombre de archivo', value: 'fileName' },
  { label: 'Total de registros', value: 'totalRecords' },
  { label: 'Riesgo alto', value: 'highRiskCount' },
  { label: 'Riesgo medio', value: 'mediumRiskCount' },
  { label: 'Riesgo bajo', value: 'lowRiskCount' },
];

const pageSizeOptions = [10, 20, 50];

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const isLoadingRef = useRef(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(
    null,
  );
  const [exportMessage, setExportMessage] = useState('');

  const loadHistory = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsRefreshing(true);
    setErrorMessage('');
    setExportMessage('');

    try {
      const response = await historyService.findAll();

      setRecords(response);
      setLoadState('ready');
    } catch (error) {
      const sessionRecords = historyService.getSessionHistory();
      setRecords(sessionRecords);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401 || status === 403) {
          setLoadState('expired');
          setErrorMessage('Tu sesión expiró. Inicia sesión nuevamente.');
        } else if (!error.response) {
          setLoadState('api-unavailable');
          setErrorMessage('No se pudo establecer comunicación con la API.');
        } else {
          setLoadState('error');
          setErrorMessage('No fue posible recuperar el historial.');
        }
      } else {
        setLoadState('error');
        setErrorMessage('No fue posible recuperar el historial.');
      }
    } finally {
      isLoadingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadHistory]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedRecord(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const availableStatuses = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.status).filter(Boolean)),
      ) as string[],
    [records],
  );
  const hasDominantRisk = records.some((record) => record.dominantRisk);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [filters, records],
  );
  const sortedRecords = useMemo(
    () => sortRecords(filteredRecords, sortKey, sortDirection),
    [filteredRecords, sortDirection, sortKey],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const visibleRecords = sortedRecords.slice(
    (currentPageSafe - 1) * pageSize,
    currentPageSafe * pageSize,
  );
  const summary = useMemo(() => getHistorySummary(records), [records]);

  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('desc');
  };

  const exportVisibleHistory = () => {
    const didExport = exportRowsToCsv(
      sortedRecords.map(toCsvRow),
      `fraudshield_historial_${new Date().toISOString().slice(0, 10)}.csv`,
    );

    setExportMessage(
      didExport
        ? 'Historial visible exportado correctamente.'
        : 'No hay registros visibles para exportar.',
    );
  };

  const exportBatch = (record: HistoryRecord) => {
    const didExport = exportRowsToCsv(
      [toCsvRow(record)],
      `fraudshield_batch_${record.batchId}_resumen.csv`,
    );

    setExportMessage(
      didExport
        ? `Resumen del Batch #${record.batchId} exportado correctamente.`
        : 'No fue posible exportar el lote seleccionado.',
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="module-sticky-header app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Trazabilidad
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Historial de Procesamiento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatNumber(sortedRecords.length)} resultados encontrados
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Actualizar historial
              </button>
              <button
                type="button"
                onClick={exportVisibleHistory}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
              >
                <FiDownload className="h-4 w-4" aria-hidden="true" />
                Exportar historial
              </button>
            </div>
          </div>
        </section>

        <HistorySummary summary={summary} />

        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <HistoryFilters
            filters={draftFilters}
            statuses={availableStatuses}
            hasDominantRisk={hasDominantRisk}
            onChange={setDraftFilters}
            onApply={applyDraftFilters}
            onClear={clearFilters}
          />

          <div className="mt-5 flex flex-col gap-3 border-y border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Ordenar por
              <select
                value={sortKey}
                onChange={(event) => handleSort(event.target.value as SortKey)}
                className="ml-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setSortDirection((current) =>
                  current === 'asc' ? 'desc' : 'asc',
                )
              }
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {sortDirection === 'desc' ? 'Más reciente primero' : 'Ascendente'}
            </button>
          </div>

          {loadState === 'loading' ? (
            <InterfaceState
              title="Cargando historial..."
              description="Consultando lotes procesados disponibles."
            />
          ) : loadState !== 'ready' && records.length === 0 ? (
            <InterfaceState
              title={errorMessage}
              description="Revisa la conexión o inicia sesión nuevamente."
              actionLabel="Reintentar"
              onAction={() => void loadHistory()}
            />
          ) : sortedRecords.length === 0 ? (
            <InterfaceState
              title="Aún no existen archivos procesados."
              description="Cuando proceses un CSV, sus lotes aparecerán aquí."
            />
          ) : (
            <>
              {loadState !== 'ready' ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {errorMessage} Se muestran registros disponibles en la sesión
                  actual, si existen.
                </div>
              ) : null}

              {exportMessage ? (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                  {exportMessage}
                </div>
              ) : null}

              <HistoryTable
                records={visibleRecords}
                onOpenDetail={setSelectedRecord}
              />
              <MobileHistoryCards
                records={visibleRecords}
                onOpenDetail={setSelectedRecord}
              />

              {sortedRecords.length > 10 ? (
                <Pagination
                  page={currentPageSafe}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  totalRecords={sortedRecords.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(value) => {
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      {selectedRecord ? (
        <BatchDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onExport={() => exportBatch(selectedRecord)}
        />
      ) : null}
    </DashboardLayout>
  );
}

function HistorySummary({ summary }: { summary: ReturnType<typeof getHistorySummary> }) {
  const cards = [
    { label: 'Total de lotes', value: summary.totalBatches, icon: FiArchive },
    {
      label: 'Lotes completados',
      value: summary.completedBatches,
      icon: FiCheckCircle,
    },
    {
      label: 'Lotes con error',
      value: summary.failedBatches,
      icon: FiAlertCircle,
    },
    {
      label: 'Lotes pendientes',
      value: summary.pendingBatches,
      icon: FiClock,
    },
    {
      label: 'Transacciones procesadas',
      value: summary.totalTransactions,
      icon: FiBarChart2,
    },
    {
      label: 'Último procesamiento',
      value: summary.lastProcessing
        ? formatDate(summary.lastProcessing)
        : 'No disponible',
      icon: FiFileText,
      isDate: true,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <article key={card.label} className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <card.icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {card.isDate
              ? card.value
              : formatNumber(card.value as number)}
          </p>
        </article>
      ))}
    </section>
  );
}

function HistoryFilters({
  filters,
  statuses,
  hasDominantRisk,
  onChange,
  onApply,
  onClear,
}: {
  filters: HistoryFiltersState;
  statuses: string[];
  hasDominantRisk: boolean;
  onChange: (filters: HistoryFiltersState) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(140px,1fr))]">
        <label className="text-sm font-semibold text-slate-700">
          Buscar archivo o Batch ID
          <span className="relative mt-2 block">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={filters.query}
              onChange={(event) =>
                onChange({ ...filters, query: event.target.value })
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="archivo.csv o 12"
            />
          </span>
        </label>

        {statuses.length > 0 ? (
          <SelectFilter
            label="Estado"
            value={filters.status}
            options={statuses}
            onChange={(status) => onChange({ ...filters, status })}
            getOptionLabel={formatStatusLabel}
          />
        ) : null}

        {hasDominantRisk ? (
          <SelectFilter
            label="Riesgo predominante"
            value={filters.dominantRisk}
            options={['Alto', 'Medio', 'Bajo']}
            onChange={(dominantRisk) =>
              onChange({
                ...filters,
                dominantRisk: dominantRisk as HistoryFiltersState['dominantRisk'],
              })
            }
          />
        ) : null}

        <DateFilter
          label="Fecha desde"
          value={filters.dateFrom}
          onChange={(dateFrom) => onChange({ ...filters, dateFrom })}
        />
        <DateFilter
          label="Fecha hasta"
          value={filters.dateTo}
          onChange={(dateTo) => onChange({ ...filters, dateTo })}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:bg-slate-800"
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  getOptionLabel = (option) => option,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  getOptionLabel?: (value: string) => string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function HistoryTable({
  records,
  onOpenDetail,
}: {
  records: HistoryRecord[];
  onOpenDetail: (record: HistoryRecord) => void;
}) {
  return (
    <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
      <table className="w-full table-fixed divide-y divide-slate-200">
        <caption className="sr-only">
          Historial de archivos y lotes procesados por FraudShield
        </caption>
        <thead>
          <tr>
            <TableHeader className="w-[27%] pl-4">Archivo / lote</TableHeader>
            <TableHeader className="w-[13%]">Fecha</TableHeader>
            <TableHeader className="w-[13%]">Estado</TableHeader>
            <TableHeader className="w-[12%]">Transacciones</TableHeader>
            <TableHeader className="w-[12%]">A / M / B</TableHeader>
            <TableHeader className="w-[11%]">Predominante</TableHeader>
            <TableHeader className="w-[12%]">Acciones</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr key={`${record.source}-${record.batchId}`} className="align-top transition hover:bg-slate-50">
              <td className="px-3 py-2.5 pl-4 text-sm font-semibold">
                <Link
                  to={`/results?batchId=${record.batchId}`}
                  className="block truncate text-blue-700 hover:text-blue-900"
                >
                  {record.fileName}
                </Link>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Lote #{record.batchId}
                </p>
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-600">
                {formatDate(record.uploadedAt)}
              </td>
              <td className="px-3 py-2.5">
                <HistoryStatusBadge status={record.status} />
                {isFailedStatus(record.status) && getRecordError(record) ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-red-600">
                    {getRecordError(record)}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">
                {formatOptionalNumber(record.totalRecords)}
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold">
                <span className="text-red-700">{formatOptionalNumber(record.highRiskCount)}</span>
                <span className="text-slate-400"> / </span>
                <span className="text-amber-700">{formatOptionalNumber(record.mediumRiskCount)}</span>
                <span className="text-slate-400"> / </span>
                <span className="text-emerald-700">{formatOptionalNumber(record.lowRiskCount)}</span>
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                {record.dominantRisk ?? 'No disponible'}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    to={`/results?batchId=${record.batchId}`}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Ver resultados
                  </Link>
                  <Link
                    to="/transactions"
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Ver transacciones
                  </Link>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(record)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    aria-label={`Ver detalle del batch ${record.batchId}`}
                  >
                    <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                    Detalle
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileHistoryCards({
  records,
  onOpenDetail,
}: {
  records: HistoryRecord[];
  onOpenDetail: (record: HistoryRecord) => void;
}) {
  return (
    <div className="mt-4 space-y-3 md:hidden">
      {records.map((record) => (
        <article
          key={`${record.source}-${record.batchId}`}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/results?batchId=${record.batchId}`}
                className="block truncate text-sm font-bold text-blue-700"
              >
                {record.fileName}
              </Link>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Lote #{record.batchId} · {formatDate(record.uploadedAt)}
              </p>
            </div>
            <HistoryStatusBadge status={record.status} />
          </div>

          {isFailedStatus(record.status) && getRecordError(record) ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              {getRecordError(record)}
            </p>
          ) : null}

          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <MobileFact
              label="Transacciones"
              value={formatOptionalNumber(record.totalRecords)}
            />
            <MobileFact
              label="A / M / B"
              value={`${formatOptionalNumber(record.highRiskCount)} / ${formatOptionalNumber(record.mediumRiskCount)} / ${formatOptionalNumber(record.lowRiskCount)}`}
            />
            <MobileFact
              label="Predominante"
              value={record.dominantRisk ?? 'No disponible'}
            />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/results?batchId=${record.batchId}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
              Ver resultados
            </Link>
            <Link
              to="/transactions"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
              Ver transacciones
            </Link>
            <button
              type="button"
              onClick={() => onOpenDetail(record)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
              <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
              Detalle
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function MobileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
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
    <th className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

function Pagination({
  page,
  pageSize,
  totalPages,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Página {page} de {totalPages} · {formatNumber(totalRecords)} registros
      </p>
      <div className="flex flex-wrap gap-3">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          aria-label="Registros por página"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} por página
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function BatchDetailDrawer({
  record,
  onClose,
  onExport,
}: {
  record: HistoryRecord;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <DetailPanel
      icon={<FiArchive className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Detalle del lote"
      title={`Lote #${record.batchId}`}
      badge={
        <DetailBadge tone={getHistoryDetailTone(record.status)}>
          {formatStatusLabel(record.status)}
        </DetailBadge>
      }
      meta={`${record.fileName} · ${formatDate(record.uploadedAt)}`}
      onClose={onClose}
      footer={
        <>
          <Link
            to={`/results?batchId=${record.batchId}`}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Ver resultados
          </Link>
          <Link
            to="/transactions"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50"
          >
            Ver transacciones
          </Link>
          <button
            type="button"
            onClick={onExport}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50"
          >
            Exportar resumen
          </button>
        </>
      }
    >
      <DetailSection title="Resumen" tone={getHistoryDetailTone(record.status)}>
        <DetailGrid>
          <DetailField label="Estado" value={formatStatusLabel(record.status)} />
          <DetailField
            label="Fecha y hora"
            value={formatDate(record.uploadedAt)}
          />
          <DetailField
            label="Total de transacciones"
            value={formatOptionalNumber(record.totalRecords)}
          />
          <DetailField
            label="Riesgo predominante"
            value={record.dominantRisk ?? 'No disponible'}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Identificación">
        <DetailGrid>
          <DetailField label="Archivo" value={record.fileName} wide />
          <DetailField label="Lote" value={`#${record.batchId}`} />
          <DetailField
            label="Archivo cargado"
            value={record.uploadedFileId ? `#${record.uploadedFileId}` : 'No disponible'}
          />
          <DetailField
            label="Tamaño"
            value={formatOptionalFileSize(record.fileSize)}
          />
          <DetailField
            label="Responsable"
            value={record.responsibleUser ?? 'No disponible'}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Información operacional">
        <DetailGrid>
          <DetailField
            label="Riesgo alto"
            value={formatOptionalNumber(record.highRiskCount)}
          />
          <DetailField
            label="Riesgo medio"
            value={formatOptionalNumber(record.mediumRiskCount)}
          />
          <DetailField
            label="Riesgo bajo"
            value={formatOptionalNumber(record.lowRiskCount)}
          />
          <DetailField
            label="Origen del registro"
            value={
              record.source === 'api'
                ? 'Historial persistido'
                : 'Sesión actual'
            }
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Detalle completo o trazabilidad">
        {record.validationMessages.length > 0 ? (
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {record.validationMessages.map((message) => (
              <li key={message} className="break-words">
                {message}
              </li>
            ))}
          </ul>
        ) : (
          <DetailNote tone="emerald">
            No se registraron errores de validación para este lote.
          </DetailNote>
        )}
      </DetailSection>
    </DetailPanel>
  );
}

function getHistoryDetailTone(status?: string) {
  if (status === 'COMPLETED') return 'emerald' as const;
  if (status === 'FAILED') return 'red' as const;
  if (status === 'PENDING') return 'amber' as const;
  return 'slate' as const;
}

function InterfaceState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function applyFilters(records: HistoryRecord[], filters: HistoryFiltersState) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const fromTime = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00`).getTime()
    : null;
  const toTime = filters.dateTo
    ? new Date(`${filters.dateTo}T23:59:59`).getTime()
    : null;

  return records.filter((record) => {
    const recordTime = record.uploadedAt
      ? new Date(record.uploadedAt).getTime()
      : null;
    const matchesQuery =
      !normalizedQuery ||
      record.fileName.toLowerCase().includes(normalizedQuery) ||
      String(record.batchId).includes(normalizedQuery);
    const matchesStatus =
      !filters.status || record.status === filters.status;
    const matchesRisk =
      !filters.dominantRisk || record.dominantRisk === filters.dominantRisk;
    const matchesFrom =
      fromTime === null || (recordTime !== null && recordTime >= fromTime);
    const matchesTo =
      toTime === null || (recordTime !== null && recordTime <= toTime);

    return (
      matchesQuery &&
      matchesStatus &&
      matchesRisk &&
      matchesFrom &&
      matchesTo
    );
  });
}

function sortRecords(
  records: HistoryRecord[],
  sortKey: SortKey,
  direction: SortDirection,
) {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    if (sortKey === 'fileName') {
      return first.fileName.localeCompare(second.fileName, 'es-CL') * multiplier;
    }

    if (sortKey === 'uploadedAt') {
      return (
        (new Date(first.uploadedAt ?? 0).getTime() -
          new Date(second.uploadedAt ?? 0).getTime()) *
        multiplier
      );
    }

    return ((first[sortKey] ?? 0) - (second[sortKey] ?? 0)) * multiplier;
  });
}

function getHistorySummary(records: HistoryRecord[]) {
  const totals = records.reduce(
    (summary, record) => {
      const normalizedStatus = getStatusKind(record.status);

      return {
        totalBatches: summary.totalBatches + 1,
        completedBatches:
          summary.completedBatches +
          (normalizedStatus === 'completed'
            ? 1
            : 0),
        failedBatches:
          summary.failedBatches +
          (normalizedStatus === 'failed'
            ? 1
            : 0),
        pendingBatches:
          summary.pendingBatches +
          (normalizedStatus === 'pending'
            ? 1
            : 0),
        totalTransactions:
          summary.totalTransactions + (record.totalRecords ?? 0),
        highRiskCount: summary.highRiskCount + (record.highRiskCount ?? 0),
        mediumRiskCount:
          summary.mediumRiskCount + (record.mediumRiskCount ?? 0),
        lowRiskCount: summary.lowRiskCount + (record.lowRiskCount ?? 0),
      };
    },
    {
      totalBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      pendingBatches: 0,
      totalTransactions: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    },
  );
  const lastProcessing = sortRecords(records, 'uploadedAt', 'desc')[0]
    ?.uploadedAt;
  const dominantRisk = getDominantRiskFromTotals(totals);

  return { ...totals, lastProcessing, dominantRisk };
}

function getDominantRiskFromTotals(totals: {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}) {
  const risks: Array<{ label: HistoryRisk; value: number }> = [
    { label: 'Alto', value: totals.highRiskCount },
    { label: 'Medio', value: totals.mediumRiskCount },
    { label: 'Bajo', value: totals.lowRiskCount },
  ];
  const highest = risks.sort((first, second) => second.value - first.value)[0];

  return highest.value > 0 ? highest.label : undefined;
}

function toCsvRow(record: HistoryRecord) {
  return {
    archivo: record.fileName,
    fecha: formatDate(record.uploadedAt),
    estado: record.status ?? 'No disponible',
    tamano: formatOptionalFileSize(record.fileSize),
    batch_id: record.batchId,
    total: record.totalRecords ?? '',
    alto: record.highRiskCount ?? '',
    medio: record.mediumRiskCount ?? '',
    bajo: record.lowRiskCount ?? '',
    predominante: record.dominantRisk ?? '',
  };
}

function formatOptionalNumber(value?: number) {
  return typeof value === 'number' ? formatNumber(value) : 'No disponible';
}

function formatOptionalFileSize(value?: number) {
  return typeof value === 'number' ? formatFileSize(value) : 'No disponible';
}

function getStatusKind(status?: string | null) {
  const value = status?.trim().toLowerCase() ?? '';

  if (['completed', 'completado', 'complete', 'success'].includes(value)) {
    return 'completed';
  }

  if (['failed', 'fallido', 'error', 'rejected', 'rechazado'].includes(value)) {
    return 'failed';
  }

  if (
    ['pending', 'pendiente', 'processing', 'procesando', 'in_progress'].includes(
      value,
    )
  ) {
    return 'pending';
  }

  return 'unknown';
}

function formatStatusLabel(status?: string | null) {
  const labels: Record<ReturnType<typeof getStatusKind>, string> = {
    completed: 'Completado',
    failed: 'Fallido',
    pending: 'Pendiente',
    unknown: status || 'No disponible',
  };

  return labels[getStatusKind(status)];
}

function isFailedStatus(status?: string | null) {
  return getStatusKind(status) === 'failed';
}

function getRecordError(record: HistoryRecord) {
  return (
    record.validationMessages.find((message) => message.trim()) ??
    record.histories
      .map((history) => history.description ?? history.action)
      .find((message) => message?.trim()) ??
    ''
  );
}

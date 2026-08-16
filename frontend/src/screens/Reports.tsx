import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiActivity,
  FiAlertTriangle,
  FiArchive,
  FiDownload,
  FiFileText,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import DashboardLayout from '../components/layout/DashboardLayout';
import reportService, { type ReportDataset } from '../services/report.service';
import { exportRowsToCsv } from '../utils/exportCsv';
import { formatDate, formatNumber } from '../utils/formatDate';
import type { ApiAuditLog } from '../services/audit-log.service';
import type { ApiHistoryBatch } from '../types/history';
import type {
  ApiRiskCase,
  ApiTransaction,
  RiskCaseStatus,
  RiskExplanation,
  RiskRuleDetail,
} from '../types/transaction';

type ReportTab = 'processing' | 'risk' | 'cases' | 'audit';
type RiskFilter = 'TODOS' | 'BAJO' | 'MEDIO' | 'ALTO';
type StatusFilter =
  | 'TODOS'
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | RiskCaseStatus;

interface ReportFilters {
  fromDate: string;
  toDate: string;
  risk: RiskFilter;
  status: StatusFilter;
  batchId: string;
  query: string;
}

interface BatchReportRow {
  id: number;
  fileName: string;
  date?: string;
  status?: string;
  transactions: number;
  low: number;
  medium: number;
  high: number;
  cases: number;
}

interface RuleActivation {
  code: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  name: string;
  description: string;
  count: number;
}

const tabs: Array<{ id: ReportTab; label: string; icon: IconType }> = [
  { id: 'processing', label: 'Procesamiento', icon: FiArchive },
  { id: 'risk', label: 'Riesgo', icon: FiAlertTriangle },
  { id: 'cases', label: 'Casos', icon: FiLayers },
  { id: 'audit', label: 'Auditoría', icon: FiActivity },
];

const emptyDataset: ReportDataset = {
  batches: [],
  transactions: [],
  cases: [],
  auditLogs: [],
};

const initialFilters: ReportFilters = {
  fromDate: '',
  toDate: '',
  risk: 'TODOS',
  status: 'TODOS',
  batchId: '',
  query: '',
};

const riskColors = {
  BAJO: '#10b981',
  MEDIO: '#f59e0b',
  ALTO: '#ef4444',
};

const caseStatusLabels: Record<RiskCaseStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
};

const ruleDefaults: RuleActivation[] = [
  {
    code: 'R1',
    name: 'Monto superior',
    description: 'Monto superior a $500.000 CLP',
    count: 0,
  },
  {
    code: 'R2',
    name: 'Horario nocturno',
    description: 'Transacción realizada en horario nocturno',
    count: 0,
  },
  {
    code: 'R3',
    name: 'Frecuencia elevada',
    description: 'Más de 3 transacciones del mismo cliente',
    count: 0,
  },
  {
    code: 'R4',
    name: 'Ubicaciones distintas',
    description: 'Ubicaciones distintas en menos de una hora',
    count: 0,
  },
  {
    code: 'R5',
    name: 'Sin condiciones relevantes',
    description: 'No se detectaron condiciones relevantes',
    count: 0,
  },
];

export default function Reports() {
  const [dataset, setDataset] = useState<ReportDataset>(emptyDataset);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<ReportTab>('processing');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReports = async () => {
    setIsRefreshing(true);
    setError('');

    try {
      setDataset(await reportService.getDataset());
    } catch {
      setError('No fue posible cargar los datos reales de reportabilidad.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const batchOptions = useMemo(
    () =>
      dataset.batches
        .map((batch) => ({
          id: batch.id,
          label: `Lote #${batch.id} · ${getBatchFileName(batch)}`,
        }))
        .sort((first, second) => second.id - first.id),
    [dataset.batches],
  );

  const batchStatusById = useMemo(
    () =>
      new Map(
        dataset.batches.map((batch) => [
          batch.id,
          batch.status ?? batch.uploadedFile?.status,
        ]),
      ),
    [dataset.batches],
  );

  const filteredTransactions = useMemo(
    () => filterTransactions(dataset.transactions, filters, batchStatusById),
    [batchStatusById, dataset.transactions, filters],
  );

  const filteredCases = useMemo(
    () => filterCases(dataset.cases, filters, batchStatusById),
    [batchStatusById, dataset.cases, filters],
  );

  const filteredAuditLogs = useMemo(
    () => filterAuditLogs(dataset.auditLogs, filters),
    [dataset.auditLogs, filters],
  );

  const batchRows = useMemo(
    () => buildBatchRows(dataset.batches, filteredTransactions, filteredCases),
    [dataset.batches, filteredCases, filteredTransactions],
  );

  const filteredBatchRows = useMemo(
    () => filterBatchRows(batchRows, filters),
    [batchRows, filters],
  );

  const kpis = useMemo(
    () => ({
      batches: filteredBatchRows.length,
      transactions: filteredTransactions.length,
      highRisk: filteredTransactions.filter(
        (transaction) => getRiskLevel(transaction) === 'ALTO',
      ).length,
      cases: filteredCases.length,
    }),
    [filteredBatchRows.length, filteredCases.length, filteredTransactions],
  );

  const riskDistribution = useMemo(
    () => [
      {
        name: 'Bajo',
        key: 'BAJO',
        value: filteredTransactions.filter(
          (transaction) => getRiskLevel(transaction) === 'BAJO',
        ).length,
        color: riskColors.BAJO,
      },
      {
        name: 'Medio',
        key: 'MEDIO',
        value: filteredTransactions.filter(
          (transaction) => getRiskLevel(transaction) === 'MEDIO',
        ).length,
        color: riskColors.MEDIO,
      },
      {
        name: 'Alto',
        key: 'ALTO',
        value: filteredTransactions.filter(
          (transaction) => getRiskLevel(transaction) === 'ALTO',
        ).length,
        color: riskColors.ALTO,
      },
    ],
    [filteredTransactions],
  );

  const caseStatusDistribution = useMemo(
    () => [
      {
        name: 'Pendiente',
        status: 'PENDIENTE',
        value: filteredCases.filter((riskCase) => riskCase.status === 'PENDIENTE')
          .length,
        color: '#f59e0b',
      },
      {
        name: 'En revisión',
        status: 'EN_REVISION',
        value: filteredCases.filter(
          (riskCase) => riskCase.status === 'EN_REVISION',
        ).length,
        color: '#2563eb',
      },
      {
        name: 'Resuelto',
        status: 'RESUELTO',
        value: filteredCases.filter((riskCase) => riskCase.status === 'RESUELTO')
          .length,
        color: '#10b981',
      },
    ],
    [filteredCases],
  );

  const ruleActivations = useMemo(
    () => buildRuleActivations(filteredTransactions),
    [filteredTransactions],
  );

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage('');
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setMessage('');
  };

  const handleExport = () => {
    const exported = exportRowsToCsv(
      filteredBatchRows.map((row) => ({
        lote: row.id,
        archivo: row.fileName,
        fecha: row.date,
        transacciones: row.transactions,
        bajo: row.low,
        medio: row.medium,
        alto: row.high,
        casos: row.cases,
        estado: row.status,
      })),
      `fraudshield-reporte-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    setMessage(
      exported
        ? 'CSV generado con los filtros actuales.'
        : 'No existen lotes visibles para exportar.',
    );
  };

  const handlePdf = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Reportes
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Análisis y exportación operacional de FraudShield.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Indicadores construidos desde lotes, transacciones, casos y
                auditoría registrados en PostgreSQL.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Actualizar
              </button>
              <button
                type="button"
                onClick={handlePdf}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <FiFileText className="h-4 w-4" aria-hidden="true" />
                Generar PDF
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <FiDownload className="h-4 w-4" aria-hidden="true" />
                Exportar CSV
              </button>
            </div>
          </div>

          {message ? (
            <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              {message}
            </p>
          ) : null}
        </section>

        {isLoading ? (
          <ReportsSkeleton />
        ) : error ? (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadReports()}
                className="rounded-2xl bg-red-700 px-4 py-2 text-white"
              >
                Reintentar
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportKpi
                title="Lotes procesados"
                value={kpis.batches}
                description="Lotes visibles según filtros."
                icon={FiArchive}
                tone="blue"
              />
              <ReportKpi
                title="Transacciones analizadas"
                value={kpis.transactions}
                description="Transacciones clasificadas del período."
                icon={FiFileText}
                tone="cyan"
              />
              <ReportKpi
                title="Riesgo alto"
                value={kpis.highRisk}
                description="Operaciones con revisión prioritaria."
                icon={FiAlertTriangle}
                tone="red"
              />
              <ReportKpi
                title="Casos generados"
                value={kpis.cases}
                description="Casos operacionales asociados."
                icon={FiLayers}
                tone="emerald"
              />
            </section>

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <FilterField label="Desde">
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(event) =>
                      handleFilterChange('fromDate', event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </FilterField>
                <FilterField label="Hasta">
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(event) =>
                      handleFilterChange('toDate', event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </FilterField>
                <FilterField label="Riesgo">
                  <select
                    value={filters.risk}
                    onChange={(event) =>
                      handleFilterChange('risk', event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="BAJO">Bajo</option>
                    <option value="MEDIO">Medio</option>
                    <option value="ALTO">Alto</option>
                  </select>
                </FilterField>
                <FilterField label="Estado">
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      handleFilterChange('status', event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="PENDING">Lote pendiente</option>
                    <option value="COMPLETED">Lote completado</option>
                    <option value="FAILED">Lote fallido</option>
                    <option value="PENDIENTE">Caso pendiente</option>
                    <option value="EN_REVISION">Caso en revisión</option>
                    <option value="RESUELTO">Caso resuelto</option>
                  </select>
                </FilterField>
                <FilterField label="Lote / archivo">
                  <select
                    value={filters.batchId}
                    onChange={(event) =>
                      handleFilterChange('batchId', event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Todos</option>
                    {batchOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Búsqueda">
                  <div className="flex gap-2">
                    <input
                      value={filters.query}
                      onChange={(event) =>
                        handleFilterChange('query', event.target.value)
                      }
                      placeholder="Archivo, estado, regla"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </FilterField>
              </div>
            </section>

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Resumen del período
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    El período contiene {formatNumber(kpis.batches)} lotes,
                    {` ${formatNumber(kpis.transactions)} `}transacciones
                    analizadas y {formatNumber(kpis.cases)} casos generados.
                    Riesgo alto representa {formatNumber(kpis.highRisk)}
                    operaciones dentro del universo filtrado.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <MiniSummary label="Eventos de auditoría" value={filteredAuditLogs.length} />
                  <MiniSummary
                    label="Casos abiertos"
                    value={
                      filteredCases.filter(
                        (riskCase) => riskCase.status !== 'RESUELTO',
                      ).length
                    }
                  />
                  <MiniSummary
                    label="Reglas activadas"
                    value={ruleActivations.reduce(
                      (total, rule) => total + rule.count,
                      0,
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
                        isActive
                          ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20'
                          : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {activeTab === 'processing' && (
                  <ProcessingTab rows={filteredBatchRows} />
                )}
                {activeTab === 'risk' && (
                  <RiskTab
                    riskDistribution={riskDistribution}
                    ruleActivations={ruleActivations}
                  />
                )}
                {activeTab === 'cases' && (
                  <CasesTab
                    cases={filteredCases}
                    statusDistribution={caseStatusDistribution}
                  />
                )}
                {activeTab === 'audit' && (
                  <AuditTab auditLogs={filteredAuditLogs} />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProcessingTab({ rows }: { rows: BatchReportRow[] }) {
  if (rows.length === 0) {
    return <EmptyState text="No existen lotes que coincidan con los filtros." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[1040px] divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {[
              'Lote',
              'Archivo',
              'Fecha',
              'Transacciones',
              'Bajo',
              'Medio',
              'Alto',
              'Casos',
              'Estado',
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
          {rows.map((row) => (
            <tr key={row.id} className="align-top hover:bg-blue-50/40">
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-slate-950">
                #{row.id}
              </td>
              <td className="min-w-60 px-3 py-2.5 text-sm font-semibold text-slate-700">
                {row.fileName}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
                {formatDate(row.date)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-800">
                {formatNumber(row.transactions)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-emerald-700">
                {formatNumber(row.low)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-amber-700">
                {formatNumber(row.medium)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-red-700">
                {formatNumber(row.high)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-blue-700">
                {formatNumber(row.cases)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <StatusBadge value={row.status ?? 'SIN_ESTADO'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskTab({
  riskDistribution,
  ruleActivations,
}: {
  riskDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  ruleActivations: RuleActivation[];
}) {
  const totalRisk = riskDistribution.reduce((total, item) => total + item.value, 0);
  const maxRuleCount = Math.max(...ruleActivations.map((rule) => rule.count), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Bajo / Medio / Alto
        </h2>
        {totalRisk === 0 ? (
          <EmptyState text="No hay transacciones filtradas para graficar." />
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-[minmax(220px,1fr)_220px] md:items-center">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value, name) => [
                      `${formatNumber(Number(value ?? 0))} transacciones`,
                      String(name),
                    ]}
                  />
                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={4}
                    stroke="#ffffff"
                    strokeWidth={4}
                  >
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {riskDistribution.map((item) => (
                <LegendRow
                  key={item.name}
                  color={item.color}
                  label={`Riesgo ${item.name.toLowerCase()}`}
                  value={`${formatNumber(item.value)} · ${Math.round(
                    (item.value / totalRisk) * 100,
                  )}%`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Reglas más activadas
        </h2>
        <div className="mt-5 space-y-4">
          {ruleActivations.map((rule) => (
            <div key={rule.code}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-950">
                    {rule.code} · {rule.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {rule.description}
                  </p>
                </div>
                <span className="rounded-xl bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                  {formatNumber(rule.count)}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-700"
                  style={{ width: `${Math.max((rule.count / maxRuleCount) * 100, rule.count > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CasesTab({
  cases,
  statusDistribution,
}: {
  cases: ApiRiskCase[];
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}) {
  const total = statusDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Pendiente / En revisión / Resuelto
        </h2>
        {total === 0 ? (
          <EmptyState text="No hay casos que coincidan con los filtros." />
        ) : (
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [
                    `${formatNumber(Number(value ?? 0))} casos`,
                    'Estado',
                  ]}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">Casos recientes</h2>
        {cases.length === 0 ? (
          <EmptyState text="No hay casos visibles." />
        ) : (
          <div className="mt-4 space-y-3">
            {cases.slice(0, 6).map((riskCase) => (
              <div
                key={riskCase.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-950">
                    Caso #{riskCase.id}
                  </p>
                  <StatusBadge value={caseStatusLabels[riskCase.status]} />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Riesgo {riskCase.riskLevelSnapshot} · Score{' '}
                  {riskCase.scoreSnapshot}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(riskCase.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AuditTab({ auditLogs }: { auditLogs: ApiAuditLog[] }) {
  if (auditLogs.length === 0) {
    return <EmptyState text="No hay eventos de auditoría visibles." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[920px] divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {['Fecha', 'Módulo', 'Acción', 'Detalle', 'Usuario'].map((column) => (
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
          {auditLogs.slice(0, 80).map((log) => (
            <tr key={log.id} className="align-top hover:bg-blue-50/40">
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                {formatDate(log.createdAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-800">
                {log.module}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                {log.action}
              </td>
              <td className="min-w-96 px-3 py-2.5 text-sm text-slate-700">
                {log.detail ?? 'No disponible'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                {log.user?.name ?? log.user?.email ?? 'Sistema'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportKpi({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: IconType;
  tone: 'blue' | 'cyan' | 'red' | 'emerald';
}) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  const indicatorClasses = {
    blue: 'bg-blue-600',
    cyan: 'bg-cyan-500',
    red: 'bg-red-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
      <span className={`absolute inset-x-0 top-0 h-1 ${indicatorClasses[tone]}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="relative mt-4 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function MiniSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-950">{value}</span>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone =
    normalized.includes('RESUELTO') || normalized.includes('COMPLETED')
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized.includes('REVISION') || normalized.includes('PENDING')
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : normalized.includes('FAILED')
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tone}`}
    >
      {value.replaceAll('_', ' ')}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="skeleton h-4 w-28 rounded-full" />
            <div className="skeleton mt-4 h-9 w-20 rounded-xl" />
            <div className="skeleton mt-5 h-4 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="skeleton h-40 rounded-[24px]" />
      <div className="skeleton h-96 rounded-[24px]" />
    </div>
  );
}

function buildBatchRows(
  batches: ApiHistoryBatch[],
  transactions: ApiTransaction[],
  cases: ApiRiskCase[],
): BatchReportRow[] {
  return batches
    .map((batch) => {
      const batchTransactions = transactions.filter(
        (transaction) => transaction.batchId === batch.id,
      );
      const batchCases = cases.filter(
        (riskCase) => riskCase.transaction?.batchId === batch.id,
      );
      const low = batchTransactions.filter(
        (transaction) => getRiskLevel(transaction) === 'BAJO',
      ).length;
      const medium = batchTransactions.filter(
        (transaction) => getRiskLevel(transaction) === 'MEDIO',
      ).length;
      const high = batchTransactions.filter(
        (transaction) => getRiskLevel(transaction) === 'ALTO',
      ).length;

      return {
        id: batch.id,
        fileName: getBatchFileName(batch),
        date: batch.uploadedFile?.uploadedAt ?? batch.finishedAt ?? batch.startedAt,
        status: batch.status ?? batch.uploadedFile?.status,
        transactions: batchTransactions.length,
        low,
        medium,
        high,
        cases: batchCases.length,
      };
    })
    .sort((first, second) => {
      const firstTime = new Date(first.date ?? 0).getTime();
      const secondTime = new Date(second.date ?? 0).getTime();

      return secondTime - firstTime;
    });
}

function filterBatchRows(rows: BatchReportRow[], filters: ReportFilters) {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesBatch = !filters.batchId || row.id === Number(filters.batchId);
    const matchesDate = isInDateRange(row.date, filters.fromDate, filters.toDate);
    const matchesStatus = isBatchStatus(filters.status)
      ? row.status === filters.status
      : isCaseStatus(filters.status)
        ? row.cases > 0
        : true;
    const matchesRisk =
      filters.risk === 'TODOS' ||
      (filters.risk === 'BAJO' && row.low > 0) ||
      (filters.risk === 'MEDIO' && row.medium > 0) ||
      (filters.risk === 'ALTO' && row.high > 0);
    const searchable = [row.id, row.fileName, row.status]
      .join(' ')
      .toLowerCase();

    return (
      matchesBatch &&
      matchesDate &&
      matchesStatus &&
      matchesRisk &&
      searchable.includes(query)
    );
  });
}

function filterTransactions(
  transactions: ApiTransaction[],
  filters: ReportFilters,
  batchStatusById: Map<number, string | undefined>,
) {
  const query = filters.query.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const riskLevel = getRiskLevel(transaction);
    const matchesRisk = filters.risk === 'TODOS' || riskLevel === filters.risk;
    const matchesBatch =
      !filters.batchId || transaction.batchId === Number(filters.batchId);
    const matchesStatus = isBatchStatus(filters.status)
      ? (transaction.batch?.status ?? batchStatusById.get(transaction.batchId)) ===
        filters.status
      : isCaseStatus(filters.status)
        ? transaction.riskCases?.some(
            (riskCase) => riskCase.status === filters.status,
          ) ?? false
        : true;
    const matchesDate = isInDateRange(
      transaction.transactionDate ?? transaction.createdAt,
      filters.fromDate,
      filters.toDate,
    );
    const searchable = [
      transaction.transactionCode,
      transaction.customerCode,
      transaction.originLocation,
      transaction.destinationLocation,
      riskLevel,
      getActivatedRules(transaction)
        .map((rule) => rule.code)
        .join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return (
      matchesRisk &&
      matchesBatch &&
      matchesStatus &&
      matchesDate &&
      searchable.includes(query)
    );
  });
}

function filterCases(
  cases: ApiRiskCase[],
  filters: ReportFilters,
  batchStatusById: Map<number, string | undefined>,
) {
  const query = filters.query.trim().toLowerCase();

  return cases.filter((riskCase) => {
    const matchesBatch =
      !filters.batchId || riskCase.transaction?.batchId === Number(filters.batchId);
    const matchesRisk =
      filters.risk === 'TODOS' || riskCase.riskLevelSnapshot === filters.risk;
    const matchesStatus = isCaseStatus(filters.status)
      ? riskCase.status === filters.status
      : isBatchStatus(filters.status)
        ? batchStatusById.get(riskCase.transaction?.batchId ?? 0) ===
          filters.status
        : true;
    const matchesDate = isInDateRange(
      riskCase.createdAt,
      filters.fromDate,
      filters.toDate,
    );
    const searchable = [
      riskCase.id,
      riskCase.status,
      riskCase.priority,
      riskCase.reviewResult,
      riskCase.classificationReason,
      riskCase.responsibleName,
      riskCase.transaction?.transactionCode,
      riskCase.transaction?.customerCode,
    ]
      .join(' ')
      .toLowerCase();

    return (
      matchesBatch &&
      matchesRisk &&
      matchesStatus &&
      matchesDate &&
      searchable.includes(query)
    );
  });
}

function filterAuditLogs(logs: ApiAuditLog[], filters: ReportFilters) {
  const query = filters.query.trim().toLowerCase();

  return logs.filter((log) => {
    const matchesDate = isInDateRange(log.createdAt, filters.fromDate, filters.toDate);
    const searchable = [
      log.action,
      log.module,
      log.detail,
      log.user?.name,
      log.user?.email,
    ]
      .join(' ')
      .toLowerCase();

    return matchesDate && searchable.includes(query);
  });
}

function buildRuleActivations(transactions: ApiTransaction[]): RuleActivation[] {
  const counts = new Map(ruleDefaults.map((rule) => [rule.code, 0]));

  transactions.forEach((transaction) => {
    getActivatedRules(transaction).forEach((rule) => {
      if (isRuleCode(rule.code)) {
        counts.set(rule.code, (counts.get(rule.code) ?? 0) + 1);
      }
    });
  });

  return ruleDefaults
    .map((rule) => ({
      ...rule,
      count: counts.get(rule.code) ?? 0,
    }))
    .sort((first, second) => second.count - first.count);
}

function getActivatedRules(transaction: ApiTransaction): RiskRuleDetail[] {
  const details = transaction.riskResult?.ruleDetails as RiskExplanation | null;
  const rules = details?.rules ?? details?.evaluatedRules ?? [];

  return rules.filter((rule) => rule.activated !== false);
}

function getRiskLevel(transaction: ApiTransaction) {
  return transaction.riskResult?.riskLevel?.name;
}

function getBatchFileName(batch: ApiHistoryBatch) {
  return batch.uploadedFile?.fileName ?? `Lote #${batch.id}`;
}

function isInDateRange(value: string | undefined, fromDate: string, toDate: string) {
  if (!value) {
    return true;
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return true;
  }

  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`).getTime();

    if (time < from) {
      return false;
    }
  }

  if (toDate) {
    const to = new Date(`${toDate}T23:59:59`).getTime();

    if (time > to) {
      return false;
    }
  }

  return true;
}

function isRuleCode(code: string): code is RuleActivation['code'] {
  return ['R1', 'R2', 'R3', 'R4', 'R5'].includes(code);
}

function isBatchStatus(status: StatusFilter) {
  return ['PENDING', 'COMPLETED', 'FAILED'].includes(status);
}

function isCaseStatus(status: StatusFilter): status is RiskCaseStatus {
  return ['PENDIENTE', 'EN_REVISION', 'RESUELTO'].includes(status);
}

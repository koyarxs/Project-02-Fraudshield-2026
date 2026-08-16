import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiArchive,
  FiCalendar,
  FiCheckCircle,
  FiDatabase,
  FiFileText,
  FiLayers,
  FiShield,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import MetricCard from '../components/dashboard/MetricCard';
import RiskChart from '../components/dashboard/RiskChart';
import RecentProcessingTable from '../components/dashboard/RecentProcessingTable';
import SystemStatus from '../components/dashboard/SystemStatus';
import LastProcessingCard from '../components/dashboard/LastProcessingCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import ValidationSummary from '../components/dashboard/ValidationSummary';
import QuickActions from '../components/dashboard/QuickActions';
import StorageEvidence from '../components/dashboard/StorageEvidence';
import { useAuth } from '../hooks/useAuth';
import { processingStoreService } from '../services/processing-store.service';
import riskCaseService from '../services/risk-case.service';
import transactionService from '../services/transaction.service';
import type { ProcessingBatch } from '../types/processing';
import type { ApiTransaction } from '../types/transaction';
import type { RiskCaseSummary } from '../types/transaction';
import { exportRowsToCsv } from '../utils/exportCsv';
import { formatDate } from '../utils/formatDate';

type PeriodFilter = 'today' | '7d' | '30d' | 'all';

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: 'Hoy', value: 'today' },
  { label: 'Últimos 7 días', value: '7d' },
  { label: 'Últimos 30 días', value: '30d' },
  { label: 'Todo el período', value: 'all' },
];

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [batches, setBatches] = useState<ProcessingBatch[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [caseSummary, setCaseSummary] = useState<RiskCaseSummary>({
    pending: 0,
    inReview: 0,
    resolved: 0,
    highRiskPending: 0,
    priorityOpen: 0,
    open: 0,
    suspicious: 0,
    discarded: 0,
  });
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setError('');

    try {
      const storedBatches = processingStoreService.getAll();
      const [apiTransactions, apiCaseSummary] = await Promise.all([
        transactionService.findAll(),
        riskCaseService.findSummary(),
      ]);

      setBatches(storedBatches);
      setTransactions(apiTransactions);
      setCaseSummary(apiCaseSummary);
      setApiAvailable(true);
    } catch {
      setBatches(processingStoreService.getAll());
      setTransactions([]);
      setCaseSummary({
        pending: 0,
        inReview: 0,
        resolved: 0,
        highRiskPending: 0,
        priorityOpen: 0,
        open: 0,
        suspicious: 0,
        discarded: 0,
      });
      setApiAvailable(false);
      setError('No fue posible recuperar las métricas. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    const unsubscribe = processingStoreService.subscribe(() => {
      void refreshDashboard();
    });

    return () => {
      window.clearTimeout(initialLoad);
      unsubscribe();
    };
  }, [refreshDashboard]);

  const filteredBatches = useMemo(
    () => filterBatchesByPeriod(batches, period),
    [batches, period],
  );

  const totals = useMemo(
    () =>
      filteredBatches.reduce(
        (summary, batch) => ({
          totalRecords: summary.totalRecords + batch.totalRecords,
          highRiskCount: summary.highRiskCount + batch.highRiskCount,
          mediumRiskCount:
            summary.mediumRiskCount + batch.mediumRiskCount,
          lowRiskCount: summary.lowRiskCount + batch.lowRiskCount,
          completedFiles: summary.completedFiles + 1,
          failedFiles:
            summary.failedFiles +
            (batch.status.toLowerCase().includes('fall') ? 1 : 0),
        }),
        {
          totalRecords: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          completedFiles: 0,
          failedFiles: 0,
        },
      ),
    [filteredBatches],
  );

  const lastBatch = filteredBatches[0] ?? batches[0];
  const hasMetrics = filteredBatches.length > 0;

  const metrics = [
    {
      title: 'Total de transacciones',
      value: totals.totalRecords,
      description: 'Registros clasificados desde lotes confirmados.',
      icon: FiDatabase,
      tone: 'blue' as const,
    },
    {
      title: 'Riesgo alto',
      value: totals.highRiskCount,
      description: 'Transacciones con señales críticas de revisión.',
      icon: FiAlertTriangle,
      tone: 'red' as const,
    },
    {
      title: 'Riesgo medio',
      value: totals.mediumRiskCount,
      description: 'Casos que requieren validación complementaria.',
      icon: FiShield,
      tone: 'amber' as const,
    },
    {
      title: 'Riesgo bajo',
      value: totals.lowRiskCount,
      description: 'Operaciones clasificadas con exposición reducida.',
      icon: FiCheckCircle,
      tone: 'emerald' as const,
    },
    {
      title: 'Lotes procesados',
      value: filteredBatches.length,
      description: 'Lotes disponibles para trazabilidad y consulta.',
      icon: FiArchive,
      tone: 'cyan' as const,
    },
    {
      title: 'Archivos procesados',
      value: totals.completedFiles,
      description: 'Archivos con procesamiento exitoso confirmado.',
      icon: FiFileText,
      tone: 'emerald' as const,
    },
    {
      title: 'Archivos con errores',
      value: totals.failedFiles,
      description: 'Errores históricos disponibles en datos del frontend.',
      icon: FiAlertTriangle,
      tone: 'red' as const,
    },
    {
      title: 'Última fecha',
      value: lastBatch ? formatDate(lastBatch.uploadedAt) : 'Sin datos',
      description: 'Fecha del procesamiento más reciente disponible.',
      icon: FiCalendar,
      tone: 'blue' as const,
    },
    {
      title: 'Casos abiertos',
      value: caseSummary.open ?? caseSummary.pending + caseSummary.inReview,
      description: 'Casos que aun requieren seguimiento.',
      icon: FiLayers,
      tone: 'blue' as const,
    },
    {
      title: 'Casos pendientes',
      value: caseSummary.pending,
      description: 'Gestiones creadas que esperan revision.',
      icon: FiLayers,
      tone: 'amber' as const,
    },
    {
      title: 'Casos en revision',
      value: caseSummary.inReview,
      description: 'Operaciones en analisis por el equipo.',
      icon: FiShield,
      tone: 'blue' as const,
    },
    {
      title: 'Casos resueltos',
      value: caseSummary.resolved,
      description: 'Revisiones cerradas con trazabilidad.',
      icon: FiCheckCircle,
      tone: 'emerald' as const,
    },
    {
      title: 'Alto pendientes',
      value: caseSummary.highRiskPending,
      description: 'Casos de riesgo Alto aun no resueltos.',
      icon: FiAlertTriangle,
      tone: 'red' as const,
    },
    {
      title: 'Casos prioritarios',
      value: caseSummary.priorityOpen ?? 0,
      description: 'Casos abiertos con prioridad Alta o Urgente.',
      icon: FiAlertTriangle,
      tone: 'red' as const,
    },
    {
      title: 'Sospechas descartadas',
      value: caseSummary.discarded ?? 0,
      description: 'Revisiones cerradas como falso positivo operativo.',
      icon: FiCheckCircle,
      tone: 'emerald' as const,
    },
    {
      title: 'Operaciones sospechosas',
      value: caseSummary.suspicious ?? 0,
      description: 'Casos marcados para seguimiento reforzado.',
      icon: FiAlertTriangle,
      tone: 'red' as const,
    },
  ];

  const handleExportSummary = () => {
    setExportMessage('');

    const exported = exportRowsToCsv(
      [
        {
          totalTransacciones: totals.totalRecords,
          riesgoAlto: totals.highRiskCount,
          riesgoMedio: totals.mediumRiskCount,
          riesgoBajo: totals.lowRiskCount,
          lotesProcesados: filteredBatches.length,
          archivosProcesados: totals.completedFiles,
          archivosConErrores: totals.failedFiles,
          ultimoArchivo: lastBatch?.fileName,
          ultimoBatchId: lastBatch?.batchId,
          fechaGeneracion: new Date().toISOString(),
        },
      ],
      `fraudshield_dashboard_resumen_${new Date().toISOString().slice(0, 10)}.csv`,
    );

    setExportMessage(
      exported
        ? 'Resumen exportado correctamente.'
        : 'No existen datos para exportar.',
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Resumen general del procesamiento, clasificación y
                trazabilidad de transacciones.
              </h1>
            </div>

            {batches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={[
                      'rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
                      period === option.value
                        ? 'bg-blue-700 text-white shadow-lg shadow-blue-200'
                        : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {exportMessage && (
            <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              {exportMessage}
            </p>
          )}
        </section>

        {isLoading && <DashboardSkeleton />}

        {!isLoading && error && (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                className="rounded-2xl bg-red-700 px-4 py-2 text-white"
              >
                Reintentar
              </button>
            </div>
          </section>
        )}

        {!isLoading && batches.length === 0 && (
          <section className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm font-medium text-slate-500">
            Aún no existen lotes procesados. Carga un archivo CSV para
            comenzar.
          </section>
        )}

        {!isLoading && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </div>

            <QuickActions onExport={handleExportSummary} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <RiskChart
                highRiskCount={totals.highRiskCount}
                mediumRiskCount={totals.mediumRiskCount}
                lowRiskCount={totals.lowRiskCount}
              />
              <SystemStatus
                lastUpdated={lastBatch?.uploadedAt}
                apiAvailable={apiAvailable}
                isAuthenticated={isAuthenticated}
                hasMetrics={hasMetrics}
                hasCompletedBatch={Boolean(lastBatch)}
                isRefreshing={isRefreshing}
                onRefresh={() => void refreshDashboard()}
              />
            </div>

            <LastProcessingCard batch={lastBatch} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <RecentProcessingTable rows={filteredBatches.slice(0, 5)} />
              <RecentActivity batches={filteredBatches} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <ValidationSummary
                transactions={transactions}
                lastError={error || undefined}
              />
              <StorageEvidence batch={lastBatch} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="skeleton h-4 w-28 rounded-full" />
          <div className="skeleton mt-4 h-9 w-20 rounded-xl" />
          <div className="skeleton mt-5 h-4 w-full rounded-full" />
          <div className="skeleton mt-2 h-4 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function filterBatchesByPeriod(
  batches: ProcessingBatch[],
  period: PeriodFilter,
) {
  if (period === 'all') {
    return batches;
  }

  const now = new Date();
  const start = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  }

  if (period === '7d') {
    start.setDate(now.getDate() - 7);
  }

  if (period === '30d') {
    start.setDate(now.getDate() - 30);
  }

  return batches.filter(
    (batch) => new Date(batch.uploadedAt).getTime() >= start.getTime(),
  );
}

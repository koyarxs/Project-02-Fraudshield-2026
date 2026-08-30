import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  FiActivity,
  FiDatabase,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  DetailBadge,
  DetailField,
  DetailGrid,
  DetailNote,
  DetailPanel,
  DetailSection,
} from '../components/ui/DetailPanel';
import auditLogService, {
  type ApiAuditLog,
} from '../services/audit-log.service';
import riskCaseService from '../services/risk-case.service';
import type { ApiRiskCase } from '../types/transaction';
import { formatDate, formatNumber } from '../utils/formatDate';

interface AuditFilters {
  dateFrom: string;
  dateTo: string;
  module: string;
  action: string;
  user: string;
  query: string;
}

interface AuditEntityInfo {
  entity: string;
  entityLabel: string;
  relatedId?: string;
  caseId?: number;
  transactionId?: number;
}

const emptyFilters: AuditFilters = {
  dateFrom: '',
  dateTo: '',
  module: '',
  action: '',
  user: '',
  query: '',
};

const PAGE_SIZE_OPTIONS = [10, 20];

const moduleColors: Record<string, string> = {
  AUTH: 'border-slate-200 bg-slate-50 text-slate-700',
  TRANSACTION: 'border-blue-200 bg-blue-50 text-blue-700',
  RISK_CASE: 'border-violet-200 bg-violet-50 text-violet-700',
  CONTROL_LIST: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

const moduleLabels: Record<string, string> = {
  AUTH: 'Autenticación',
  TRANSACTION: 'Transacciones',
  CONTROL_LIST: 'Listas de control',
  RISK_CASE: 'Casos',
};

const actionColors: Record<string, string> = {
  LOGIN_SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOGIN_FAILED: 'border-red-200 bg-red-50 text-red-700',
  CLASSIFY_TRANSACTION: 'border-blue-200 bg-blue-50 text-blue-700',
  UPSERT_RISK_CASE: 'border-violet-200 bg-violet-50 text-violet-700',
  UPDATE_RISK_CASE: 'border-violet-200 bg-violet-50 text-violet-700',
  STATUS_CHANGED: 'border-amber-200 bg-amber-50 text-amber-700',
  CASE_RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CASE_ASSIGNED: 'border-blue-200 bg-blue-50 text-blue-700',
  PRIORITY_CHANGED: 'border-amber-200 bg-amber-50 text-amber-700',
  UPSERT_CONTROL_LIST_ENTRY: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  UPDATE_CONTROL_LIST_ENTRY: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  DELETE_CONTROL_LIST_ENTRY: 'border-red-200 bg-red-50 text-red-700',
};

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio de sesión fallido',
  CLASSIFY_TRANSACTION: 'Clasificación de transacción',
  UPSERT_RISK_CASE: 'Creación o actualización de caso',
  UPDATE_RISK_CASE: 'Actualización de caso',
  STATUS_CHANGED: 'Cambio de estado',
  CASE_RESOLVED: 'Cierre de caso',
  CASE_ASSIGNED: 'Asignación de caso',
  PRIORITY_CHANGED: 'Cambio de prioridad',
  UPSERT_CONTROL_LIST_ENTRY: 'Creación o actualización de lista de control',
  UPDATE_CONTROL_LIST_ENTRY: 'Actualización de lista de control',
  DELETE_CONTROL_LIST_ENTRY: 'Eliminación de lista de control',
};

const chartColors = ['#2563eb', '#7c3aed', '#06b6d4', '#f59e0b', '#10b981'];

export default function Audit() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [riskCases, setRiskCases] = useState<ApiRiskCase[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadAudit = async () => {
    setIsRefreshing(true);
    setError('');

    const [auditResult, casesResult] = await Promise.allSettled([
      auditLogService.findAll(),
      riskCaseService.findAll(),
    ]);

    if (auditResult.status === 'fulfilled') {
      setLogs(auditResult.value);
    } else {
      setError('No fue posible cargar la auditoría.');
    }

    if (casesResult.status === 'fulfilled') {
      setRiskCases(casesResult.value);
    } else {
      setRiskCases([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadAudit();
  }, []);

  const riskCaseById = useMemo(
    () => new Map(riskCases.map((riskCase) => [riskCase.id, riskCase])),
    [riskCases],
  );

  const modules = useMemo(
    () => Array.from(new Set(logs.map((log) => log.module))).sort(),
    [logs],
  );

  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const users = useMemo(() => {
    const entries = new Map<string, string>();

    logs.forEach((log) => {
      if (log.user) {
        entries.set(String(log.user.id), log.user.name ?? log.user.email);
      } else {
        entries.set('system', 'Sistema');
      }
    });

    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label, 'es-CL'));
  }, [logs]);

  const visibleLogs = useMemo(
    () =>
      filterLogs(logs, filters, riskCaseById).sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      ),
    [filters, logs, riskCaseById],
  );

  const kpis = useMemo(() => {
    const activeUsers = new Set<string>();
    const summaryLogs = visibleLogs.filter((log) => !isLegacyTestEvent(log));

    summaryLogs.forEach((log) => {
      if (log.user) {
        activeUsers.add(String(log.user.id));
      }
    });

    return {
      events: summaryLogs.length,
      activeUsers: activeUsers.size,
      statusChanges: summaryLogs.filter(isStatusChange).length,
      controlListChanges: summaryLogs.filter(
        (log) => log.module === 'CONTROL_LIST',
      ).length,
    };
  }, [visibleLogs]);

  const moduleChartData = useMemo(
    () =>
      modules
        .map((module) => ({
          module: formatModule(module),
          value: visibleLogs.filter((log) => log.module === module).length,
        }))
        .filter((item) => item.value > 0)
        .sort((first, second) => second.value - first.value),
    [modules, visibleLogs],
  );

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = visibleLogs.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="module-sticky-header app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Auditoría
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Trazabilidad de acciones
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Permite identificar quién realizó una acción, cuándo ocurrió y
                qué elemento fue afectado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAudit()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Actualizar
            </button>
          </div>
        </section>

        {isLoading ? (
          <AuditSkeleton />
        ) : error ? (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadAudit()}
                className="rounded-2xl bg-red-700 px-4 py-2 text-white"
              >
                Reintentar
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AuditKpi
                title="Eventos registrados"
                value={kpis.events}
                description="Eventos visibles con los filtros actuales."
                icon={FiDatabase}
                tone="blue"
              />
              <AuditKpi
                title="Usuarios con actividad"
                value={kpis.activeUsers}
                description="Usuarios humanos presentes en AuditLog."
                icon={FiUser}
                tone="emerald"
              />
              <AuditKpi
                title="Cambios de estado de casos"
                value={kpis.statusChanges}
                description="Transiciones registradas en trazabilidad."
                icon={FiActivity}
                tone="amber"
              />
              <AuditKpi
                title="Cambios en listas de control"
                value={kpis.controlListChanges}
                description="Altas, ediciones o cambios registrados."
                icon={FiShield}
                tone="violet"
              />
            </section>

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <AuditFilters
                filters={filters}
                modules={modules}
                actions={actions}
                users={users}
                onChange={handleFilterChange}
                onClear={clearFilters}
              />
            </section>

            <EventsByModuleChart data={moduleChartData} />

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Registro de auditoría
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatNumber(visibleLogs.length)} eventos encontrados
                  </p>
                </div>
              </div>

              {visibleLogs.length === 0 ? (
                <EmptyState text="No existen eventos que coincidan con los filtros." />
              ) : (
                <AuditTable
                  logs={pagedLogs}
                  riskCaseById={riskCaseById}
                  onSelect={setSelectedLog}
                />
              )}
              {visibleLogs.length > 0 ? (
                <AuditPagination
                  page={safePage}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  totalRecords={visibleLogs.length}
                  onPageChange={setPage}
                  onPageSizeChange={(value) => {
                    setPageSize(value);
                    setPage(1);
                  }}
                />
              ) : null}
            </section>
          </>
        )}
      </div>

      {selectedLog ? (
        <AuditEventDetail
          log={selectedLog}
          riskCaseById={riskCaseById}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </DashboardLayout>
  );
}

function AuditFilters({
  filters,
  modules,
  actions,
  users,
  onChange,
  onClear,
}: {
  filters: AuditFilters;
  modules: string[];
  actions: string[];
  users: Array<{ value: string; label: string }>;
  onChange: (key: keyof AuditFilters, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(140px,0.8fr)_minmax(180px,1fr)_minmax(160px,0.9fr)_minmax(260px,1.5fr)]">
        <FilterField label="Módulo">
          <select
            value={filters.module}
            onChange={(event) => onChange('module', event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los módulos</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {formatModule(module)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Acción">
          <select
            value={filters.action}
            onChange={(event) => onChange('action', event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas las acciones</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Usuario">
          <select
            value={filters.user}
            onChange={(event) => onChange('user', event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todos los actores</option>
            {users.map((user) => (
              <option key={user.value} value={user.value}>
                {user.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Búsqueda">
          <div className="flex min-w-0 gap-2">
            <span className="relative min-w-0 flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.query}
                onChange={(event) => onChange('query', event.target.value)}
                placeholder="Acción, elemento o usuario"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </span>
            <button
              type="button"
              onClick={onClear}
              className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Limpiar
            </button>
          </div>
        </FilterField>
      </div>
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">
          Más filtros
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FilterField label="Desde">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onChange('dateFrom', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </FilterField>
          <FilterField label="Hasta">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onChange('dateTo', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </FilterField>
        </div>
      </details>
    </div>
  );
}

function AuditTable({
  logs,
  riskCaseById,
  onSelect,
}: {
  logs: ApiAuditLog[];
  riskCaseById: Map<number, ApiRiskCase>;
  onSelect: (log: ApiAuditLog) => void;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
      <table className="hidden w-full table-fixed divide-y divide-slate-200 bg-white xl:table">
        <thead className="bg-slate-50">
          <tr>
            <TableHeader className="w-[16%]">Fecha y hora</TableHeader>
            <TableHeader className="w-[16%]">Usuario</TableHeader>
            <TableHeader className="w-[14%]">Módulo</TableHeader>
            <TableHeader className="w-[20%]">Acción</TableHeader>
            <TableHeader className="w-[22%]">Elemento afectado</TableHeader>
            <TableHeader className="w-[12%]">Ver detalle</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => {
            const entity = getAuditEntity(log, riskCaseById);

            return (
              <tr
                key={log.id}
                tabIndex={0}
                role="button"
                onClick={() => onSelect(log)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(log);
                  }
                }}
                className={`cursor-pointer align-top transition hover:bg-blue-50/40 focus:bg-blue-50 focus:outline-none ${
                  log.user ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="space-y-1">
                    <ActorBadge log={log} />
                    <p className="break-words text-sm font-semibold text-slate-800">
                      {getUserLabel(log)}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ModuleBadge module={log.module} />
                </td>
                <td className="px-3 py-2.5">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                  <span className="break-words">{entity.entityLabel}</span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(log);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="divide-y divide-slate-100 bg-white xl:hidden">
        {logs.map((log) => {
          const entity = getAuditEntity(log, riskCaseById);

          return (
            <article key={log.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <ActorBadge log={log} />
                <ModuleBadge module={log.module} />
                <ActionBadge action={log.action} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                {entity.entityLabel}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(log.createdAt)} · {getUserLabel(log)}
              </p>
              <button
                type="button"
                onClick={() => onSelect(log)}
                className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Ver detalle
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EventsByModuleChart({
  data,
}: {
  data: Array<{ module: string; value: number }>;
}) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">Eventos por módulo</h2>
      {data.length === 0 ? (
        <EmptyState text="No hay eventos visibles para graficar." />
      ) : (
        <div className="mt-5 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="module"
                width={118}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [
                  `${formatNumber(Number(value ?? 0))} eventos`,
                  'Eventos',
                ]}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.module}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function AuditEventDetail({
  log,
  riskCaseById,
  onClose,
}: {
  log: ApiAuditLog;
  riskCaseById: Map<number, ApiRiskCase>;
  onClose: () => void;
}) {
  const entity = getAuditEntity(log, riskCaseById);
  const values = getTransitionValues(log);
  const hasChanges = Boolean(values.previous || values.next);

  return (
    <DetailPanel
      icon={<FiActivity className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Evento de auditoría"
      title={`Evento #${log.id}`}
      badge={
        <DetailBadge tone={getAuditDetailTone(log.module)}>
          {formatModule(log.module)}
        </DetailBadge>
      }
      meta={formatDate(log.createdAt)}
      onClose={onClose}
      footer={
        entity.caseId && entity.transactionId ? (
          <Link
            to={`/case-management?transactionId=${entity.transactionId}`}
            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Ver caso #{entity.caseId}
          </Link>
        ) : undefined
      }
    >
      <DetailSection title="Resumen" tone={getAuditDetailTone(log.module)}>
        <DetailGrid>
          <DetailField
            label="Usuario o actor"
            value={`${log.user ? 'Usuario' : 'Sistema'} · ${getUserLabel(log)}`}
          />
          <DetailField label="Fecha y hora" value={formatDate(log.createdAt)} />
          <DetailField label="Módulo" value={formatModule(log.module)} />
          <DetailField label="Acción" value={formatAction(log.action)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Identificación">
        <DetailGrid>
          <DetailField label="Elemento afectado" value={entity.entity} />
          <DetailField
            label="Referencia"
            value={entity.relatedId ?? 'No disponible'}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Cambios registrados">
        {hasChanges ? (
          <DetailGrid>
            <DetailField
              label="Valor anterior"
              value={values.previous ?? 'No disponible'}
            />
            <DetailField
              label="Valor nuevo"
              value={values.next ?? 'No disponible'}
            />
          </DetailGrid>
        ) : (
          <DetailNote>Este evento no registró cambios de valores.</DetailNote>
        )}
      </DetailSection>

      <DetailSection title="Detalle completo o trazabilidad">
        <p className="break-words text-sm leading-6 text-slate-700">
          {log.detail ?? 'No disponible'}
        </p>
        {entity.caseId && !entity.transactionId ? (
          <div className="mt-3">
            <DetailNote tone="amber">
              El evento referencia el caso #{entity.caseId}, pero no contiene
              la transacción necesaria para abrir su gestión.
            </DetailNote>
          </div>
        ) : null}
      </DetailSection>
    </DetailPanel>
  );
}

function AuditKpi({
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
  tone: 'blue' | 'violet' | 'amber' | 'emerald';
}) {
  const tones = {
    blue: {
      indicator: 'bg-blue-600',
      icon: 'border-blue-100 bg-blue-50 text-blue-700',
    },
    violet: {
      indicator: 'bg-violet-600',
      icon: 'border-violet-100 bg-violet-50 text-violet-700',
    },
    amber: {
      indicator: 'bg-amber-500',
      icon: 'border-amber-100 bg-amber-50 text-amber-700',
    },
    emerald: {
      indicator: 'bg-emerald-500',
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    },
  };

  return (
    <article className="group relative h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
      <span className={`absolute inset-x-0 top-0 h-1 ${tones[tone].indicator}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${tones[tone].icon}`}
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

function ModuleBadge({ module }: { module: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${moduleColors[module] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
    >
      {formatModule(module)}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${actionColors[action] ?? 'border-slate-200 bg-white text-slate-700'}`}
    >
      {formatAction(action)}
    </span>
  );
}

function ActorBadge({ log }: { log: ApiAuditLog }) {
  const isHuman = Boolean(log.user);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
        isHuman
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {isHuman ? 'Usuario' : 'Sistema'}
    </span>
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

function AuditPagination({
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
        Página {page} de {totalPages} · {formatNumber(totalRecords)} eventos
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
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

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="skeleton h-4 w-28 rounded-full" />
            <div className="skeleton mt-4 h-9 w-20 rounded-xl" />
            <div className="skeleton mt-5 h-4 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="skeleton h-36 rounded-[24px]" />
      <div className="skeleton h-80 rounded-[24px]" />
    </div>
  );
}

function filterLogs(
  logs: ApiAuditLog[],
  filters: AuditFilters,
  riskCaseById: Map<number, ApiRiskCase>,
) {
  const query = filters.query.trim().toLowerCase();

  return logs.filter((log) => {
    const entity = getAuditEntity(log, riskCaseById);
    const searchable = [
      log.action,
      log.module,
      log.detail,
      getUserLabel(log),
      entity.entity,
      entity.relatedId,
    ]
      .join(' ')
      .toLowerCase();

    return (
      isInDateRange(log.createdAt, filters.dateFrom, filters.dateTo) &&
      (!filters.module || log.module === filters.module) &&
      (!filters.action || log.action === filters.action) &&
      matchesUser(log, filters.user) &&
      searchable.includes(query)
    );
  });
}

function getAuditEntity(
  log: ApiAuditLog,
  riskCaseById: Map<number, ApiRiskCase>,
): AuditEntityInfo {
  const detail = log.detail ?? '';
  const caseMatch = detail.match(/Caso #(\d+)/i);
  const transactionMatch = detail.match(/transacci[oó]n #(\d+)/i);

  if (caseMatch) {
    const caseId = Number(caseMatch[1]);
    const riskCase = riskCaseById.get(caseId);
    const transactionId =
      transactionMatch?.[1] !== undefined
        ? Number(transactionMatch[1])
        : riskCase?.transactionId;

    return {
      entity: 'Caso',
      entityLabel: `Caso #${caseId}`,
      relatedId: `#${caseId}`,
      caseId,
      transactionId,
    };
  }

  if (transactionMatch) {
    const transactionId = Number(transactionMatch[1]);

    return {
      entity: 'Transacción',
      entityLabel: `Transacción #${transactionId}`,
      relatedId: `#${transactionId}`,
      transactionId,
    };
  }

  if (log.module === 'CONTROL_LIST') {
    const listMatch = detail.match(/\b(WATCHLIST|ALLOWLIST)\s+([^.\s]+)/i);
    const relatedId = listMatch?.[0];

    return {
      entity: 'Lista de control',
      entityLabel: relatedId ?? 'Lista de control',
      relatedId,
    };
  }

  if (log.module === 'AUTH') {
    const emailMatch = detail.match(/[^\s:]+@[^\s.]+\.[^\s.]+/);

    return {
      entity: 'Sesión',
      entityLabel: emailMatch?.[0] ?? 'Sesión',
      relatedId: emailMatch?.[0],
    };
  }

  return {
    entity: log.module,
    entityLabel: log.module,
  };
}

function getTransitionValues(log: ApiAuditLog) {
  const detail = log.detail ?? '';
  const statusMatch = detail.match(/de ([A-Z_]+) a ([A-Z_]+)/i);
  const assignedMatch = detail.match(/asignado a ([^.]+)/i);

  if (statusMatch) {
    return {
      previous: formatAuditValue(statusMatch[1]),
      next: formatAuditValue(statusMatch[2]),
    };
  }

  if (assignedMatch) {
    return {
      previous: undefined,
      next: assignedMatch[1],
    };
  }

  return {};
}

function isStatusChange(log: ApiAuditLog) {
  return (
    log.action === 'STATUS_CHANGED' ||
    Boolean(log.detail?.toLowerCase().includes('estado cambiado'))
  );
}

function isLegacyTestEvent(log: ApiAuditLog) {
  const detail = log.detail?.toLowerCase() ?? '';

  return (
    detail.includes('cierre-watch') ||
    detail.includes('cierre-allow') ||
    detail.includes('cierre sprint iii') ||
    detail.includes('validación duplicado sprint iii') ||
    detail.includes('validacion duplicado sprint iii')
  );
}

function matchesUser(log: ApiAuditLog, userFilter: string) {
  if (!userFilter) {
    return true;
  }

  if (userFilter === 'system') {
    return !log.user;
  }

  return String(log.user?.id) === userFilter;
}

function isInDateRange(value: string, fromDate: string, toDate: string) {
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

function getUserLabel(log: ApiAuditLog) {
  return log.user?.name ?? log.user?.email ?? 'Sistema';
}

function formatAuditValue(value: string) {
  return value.replaceAll('_', ' ');
}

function formatModule(module: string) {
  return moduleLabels[module] ?? module.replaceAll('_', ' ');
}

function formatAction(action: string) {
  return actionLabels[action] ?? action.replaceAll('_', ' ');
}

function getAuditDetailTone(module: string) {
  if (module === 'RISK_CASE') return 'violet' as const;
  if (module === 'CONTROL_LIST') return 'cyan' as const;
  if (module === 'TRANSACTION') return 'blue' as const;
  return 'slate' as const;
}

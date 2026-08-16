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
  FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import DashboardLayout from '../components/layout/DashboardLayout';
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

const moduleColors: Record<string, string> = {
  AUTH: 'border-slate-200 bg-slate-50 text-slate-700',
  TRANSACTION: 'border-blue-200 bg-blue-50 text-blue-700',
  RISK_CASE: 'border-violet-200 bg-violet-50 text-violet-700',
  CONTROL_LIST: 'border-cyan-200 bg-cyan-50 text-cyan-700',
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
      setError('No fue posible cargar la auditoria.');
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
    () => filterLogs(logs, filters, riskCaseById),
    [filters, logs, riskCaseById],
  );

  const kpis = useMemo(() => {
    const auditedCases = new Set<number>();
    const activeUsers = new Set<string>();

    visibleLogs.forEach((log) => {
      const entity = getAuditEntity(log, riskCaseById);

      if (entity.caseId) {
        auditedCases.add(entity.caseId);
      }

      activeUsers.add(log.user ? String(log.user.id) : 'system');
    });

    return {
      events: visibleLogs.length,
      auditedCases: auditedCases.size,
      statusChanges: visibleLogs.filter(isStatusChange).length,
      activeUsers: activeUsers.size,
    };
  }, [riskCaseById, visibleLogs]);

  const moduleChartData = useMemo(
    () =>
      modules
        .map((module) => ({
          module,
          value: visibleLogs.filter((log) => log.module === module).length,
        }))
        .filter((item) => item.value > 0)
        .sort((first, second) => second.value - first.value),
    [modules, visibleLogs],
  );

  const recentImportantLogs = useMemo(() => {
    const important = visibleLogs.filter(isImportantEvent);

    return (important.length > 0 ? important : visibleLogs).slice(0, 6);
  }, [visibleLogs]);

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
      <div className="space-y-4">
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Auditoria
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Centro de trazabilidad operacional.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Eventos reales registrados por FraudShield para seguimiento de
                accesos, clasificaciones, listas de control y gestion de casos.
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
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AuditKpi
                title="Eventos registrados"
                value={kpis.events}
                description="Eventos visibles con los filtros actuales."
                icon={FiDatabase}
                tone="blue"
              />
              <AuditKpi
                title="Casos auditados"
                value={kpis.auditedCases}
                description="Casos detectados desde eventos RISK_CASE."
                icon={FiShield}
                tone="violet"
              />
              <AuditKpi
                title="Cambios de estado"
                value={kpis.statusChanges}
                description="Transiciones registradas en trazabilidad."
                icon={FiActivity}
                tone="amber"
              />
              <AuditKpi
                title="Usuarios con actividad"
                value={kpis.activeUsers}
                description="Actores registrados en AuditLog."
                icon={FiUser}
                tone="emerald"
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

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <EventsByModuleChart data={moduleChartData} />
              <RecentActivity
                logs={recentImportantLogs}
                riskCaseById={riskCaseById}
                onSelect={setSelectedLog}
              />
            </section>

            <section className="app-card rounded-[24px] p-5 lg:p-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Registro de auditoria
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
                  logs={visibleLogs}
                  riskCaseById={riskCaseById}
                  onSelect={setSelectedLog}
                />
              )}
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
    <div className="grid gap-4 lg:grid-cols-[repeat(5,minmax(140px,1fr))_minmax(220px,1.4fr)]">
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
      <FilterField label="Modulo">
        <select
          value={filters.module}
          onChange={(event) => onChange('module', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Todos</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Accion">
        <select
          value={filters.action}
          onChange={(event) => onChange('action', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Todas</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Usuario">
        <select
          value={filters.user}
          onChange={(event) => onChange('user', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.value} value={user.value}>
              {user.label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Busqueda textual">
        <div className="flex gap-2">
          <span className="relative min-w-0 flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.query}
              onChange={(event) => onChange('query', event.target.value)}
              placeholder="Detalle, entidad o usuario"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[1120px] divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {['Fecha', 'Modulo', 'Accion', 'Detalle', 'Usuario', 'Entidad'].map(
              (column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                >
                  {column}
                </th>
              ),
            )}
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
                className="cursor-pointer align-top transition hover:bg-blue-50/40 focus:bg-blue-50 focus:outline-none"
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {formatDate(log.createdAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <ModuleBadge module={log.module} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <ActionBadge action={log.action} />
                </td>
                <td className="min-w-96 px-3 py-2.5 text-sm leading-5 text-slate-700">
                  {log.detail ?? 'No disponible'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                  {getUserLabel(log)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-700">
                  {entity.entityLabel}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
      <h2 className="text-lg font-bold text-slate-950">Eventos por modulo</h2>
      {data.length === 0 ? (
        <EmptyState text="No hay eventos visibles para graficar." />
      ) : (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="module" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => [
                  `${formatNumber(Number(value ?? 0))} eventos`,
                  'Eventos',
                ]}
              />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
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

function RecentActivity({
  logs,
  riskCaseById,
  onSelect,
}: {
  logs: ApiAuditLog[];
  riskCaseById: Map<number, ApiRiskCase>;
  onSelect: (log: ApiAuditLog) => void;
}) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">Actividad reciente</h2>
      {logs.length === 0 ? (
        <EmptyState text="No hay actividad reciente visible." />
      ) : (
        <div className="mt-5 space-y-3">
          {logs.map((log) => {
            const entity = getAuditEntity(log, riskCaseById);

            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onSelect(log)}
                className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ModuleBadge module={log.module} />
                  <ActionBadge action={log.action} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">
                  {log.detail ?? log.action}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(log.createdAt)} - {entity.entityLabel}
                </p>
              </button>
            );
          })}
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

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-event-title"
    >
      <div className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Detalle de evento
            </p>
            <h2
              id="audit-event-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              Evento #{log.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Cerrar detalle"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            <DetailRow label="Fecha y hora" value={formatDate(log.createdAt)} />
            <DetailRow label="Usuario" value={getUserLabel(log)} />
            <DetailRow label="Modulo" value={log.module} />
            <DetailRow label="Accion" value={log.action} />
            <DetailRow label="Entidad afectada" value={entity.entity} />
            <DetailRow
              label="ID relacionado"
              value={entity.relatedId ?? 'No disponible'}
            />
            <DetailRow
              label="Valor anterior"
              value={values.previous ?? 'No registrado en AuditLog actual'}
            />
            <DetailRow
              label="Valor nuevo"
              value={values.next ?? 'No registrado en AuditLog actual'}
            />
          </dl>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-950">
              Detalle completo
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {log.detail ?? 'No disponible'}
            </p>
          </section>

          {entity.caseId && entity.transactionId ? (
            <Link
              to={`/case-management?transactionId=${entity.transactionId}`}
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
            >
              Ver detalle del caso #{entity.caseId}
            </Link>
          ) : entity.caseId ? (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Este evento referencia el caso #{entity.caseId}, pero AuditLog no
              contiene el ID de transaccion necesario para abrir la gestion del
              caso.
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
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
      {module}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${actionColors[action] ?? 'border-slate-200 bg-white text-slate-700'}`}
    >
      {action}
    </span>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-950">
        {value}
      </dd>
    </div>
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
      entity: 'Transaccion',
      entityLabel: `Transaccion #${transactionId}`,
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
      entity: 'Sesion',
      entityLabel: emailMatch?.[0] ?? 'Sesion',
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

function isImportantEvent(log: ApiAuditLog) {
  return (
    log.module === 'RISK_CASE' ||
    [
      'LOGIN_FAILED',
      'CLASSIFY_TRANSACTION',
      'UPSERT_CONTROL_LIST_ENTRY',
      'UPDATE_CONTROL_LIST_ENTRY',
      'CASE_RESOLVED',
      'STATUS_CHANGED',
      'PRIORITY_CHANGED',
    ].includes(log.action)
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

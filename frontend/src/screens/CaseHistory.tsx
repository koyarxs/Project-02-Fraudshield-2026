import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  DetailBadge,
  DetailField,
  DetailGrid,
  DetailNote,
  DetailPanel,
  DetailSection,
} from '../components/ui/DetailPanel';
import riskCaseService from '../services/risk-case.service';
import type {
  ApiRiskCase,
  RiskCasePriority,
  RiskCaseStatus,
} from '../types/transaction';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';

const PAGE_SIZE = 10;

export default function CaseHistory() {
  const { user } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const [cases, setCases] = useState<ApiRiskCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ApiRiskCase | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sortKey, setSortKey] = useState<
    'updatedAt' | 'priority' | 'scoreSnapshot'
  >('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState<'' | RiskCasePriority>(
    '',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCases() {
      setIsLoading(true);
      setError('');

      try {
        const response = await riskCaseService.findAll();

        if (!shouldIgnore) {
          setCases(response);
        }
      } catch {
        if (!shouldIgnore) {
          setCases([]);
          setError('No fue posible consultar el historial de casos.');
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadCases();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const visibleCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cases
      .filter((riskCase) => {
        const searchable = [
          riskCase.id,
          riskCase.transactionId,
          riskCase.riskLevelSnapshot,
          riskCase.scoreSnapshot,
          riskCase.priority,
          riskCase.status,
          riskCase.reviewResult,
          riskCase.responsibleName,
          riskCase.responsibleUser?.name,
          riskCase.responsibleUser?.email,
          riskCase.transaction?.transactionCode,
        ]
          .join(' ')
          .toLowerCase();

        return (
          (!status || riskCase.status === status) &&
          (!priorityFilter || riskCase.priority === priorityFilter) &&
          searchable.includes(normalizedQuery)
        );
      })
      .sort((first, second) => {
        const direction = sortDirection === 'asc' ? 1 : -1;

        if (sortKey === 'updatedAt') {
          return (
            (new Date(first.updatedAt).getTime() -
              new Date(second.updatedAt).getTime()) *
            direction
          );
        }

        if (sortKey === 'priority') {
          return (
            (getPriorityWeight(first.priority) -
              getPriorityWeight(second.priority)) *
            direction
          );
        }

        return (first.scoreSnapshot - second.scoreSnapshot) * direction;
      });
  }, [
    cases,
    priorityFilter,
    query,
    sortDirection,
    sortKey,
    status,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleCases.length / PAGE_SIZE));
  const pagedCases = visibleCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [priorityFilter, query, sortDirection, sortKey, status]);

  const summary = useMemo(
    () => ({
      pending: cases.filter((riskCase) => riskCase.status === 'PENDIENTE').length,
      inReview: cases.filter((riskCase) => riskCase.status === 'EN_REVISION').length,
      resolved: cases.filter((riskCase) => riskCase.status === 'RESUELTO').length,
      highRiskPending: cases.filter(
        (riskCase) =>
          riskCase.riskLevelSnapshot === 'ALTO' &&
          riskCase.status !== 'RESUELTO',
      ).length,
    }),
    [cases],
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="module-sticky-header app-card rounded-[24px] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            GESTIÓN DE CASOS
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Seguimiento de revisiones realizadas por analistas
          </h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Casos pendientes" value={summary.pending} />
          <SummaryCard label="Casos en revisión" value={summary.inReview} />
          <SummaryCard label="Casos resueltos" value={summary.resolved} />
          <SummaryCard
            label="Riesgo alto pendiente"
            value={summary.highRiskPending}
          />
        </section>

        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-slate-950">
              {isAdministrator ? 'Todos los casos' : 'Mis casos'}
            </h2>
            <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[minmax(260px,1fr)_minmax(150px,0.75fr)_minmax(170px,0.85fr)_minmax(150px,0.75fr)]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar caso, transacción o responsable"
                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_REVISION">En revisión</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as '' | RiskCasePriority)
                }
                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todas las prioridades</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
              <select
                value={`${sortKey}:${sortDirection}`}
                onChange={(event) => {
                  const [nextKey, nextDirection] = event.target.value.split(
                    ':',
                  ) as [typeof sortKey, typeof sortDirection];
                  setSortKey(nextKey);
                  setSortDirection(nextDirection);
                }}
                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="updatedAt:desc">Más recientes</option>
                <option value="priority:desc">Prioridad mayor</option>
                <option value="scoreSnapshot:desc">Score mayor</option>
                <option value="scoreSnapshot:asc">Score menor</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : error ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : visibleCases.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
              No hay casos que coincidan con los filtros.
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                <table className="w-full table-fixed divide-y divide-slate-200 bg-white">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHeader className="w-[11%]">Caso</TableHeader>
                      <TableHeader className="w-[14%]">Transacción</TableHeader>
                      <TableHeader className="w-[10%]">Riesgo</TableHeader>
                      <TableHeader className="w-[8%]">Score</TableHeader>
                      <TableHeader className="w-[10%]">Prioridad</TableHeader>
                      <TableHeader className="w-[11%]">Estado</TableHeader>
                      <TableHeader className="w-[13%]">Resultado</TableHeader>
                      <TableHeader className="w-[12%]">Responsable</TableHeader>
                      <TableHeader className="w-[11%]">Acciones</TableHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedCases.map((riskCase) => (
                      <tr key={riskCase.id} className="align-top hover:bg-blue-50/40">
                        <td className="px-3 py-2.5 text-sm font-semibold text-slate-950">
                          #{riskCase.id}
                        </td>
                        <td className="truncate px-3 py-2.5 text-sm text-slate-700">
                          {getTransactionLabel(riskCase)}
                        </td>
                        <td className="px-3 py-2.5">
                          <RiskBadge value={riskCase.riskLevelSnapshot} />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">
                          {riskCase.scoreSnapshot}
                        </td>
                        <td className="px-3 py-2.5">
                          <PriorityBadge priority={riskCase.priority} />
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={riskCase.status} />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">
                          {getResultLabel(riskCase)}
                        </td>
                        <td className="truncate px-3 py-2.5 text-sm text-slate-700">
                          {getResponsibleName(riskCase)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCase(riskCase)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              Detalle
                            </button>
                            <CaseActionLink
                              riskCase={riskCase}
                              onOpenDetail={setSelectedCase}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <MobileCaseCards
                cases={pagedCases}
                onOpenDetail={setSelectedCase}
              />
            </>
          )}
          {!isLoading && !error && visibleCases.length > PAGE_SIZE ? (
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {page} de {totalPages} · {visibleCases.length} casos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {selectedCase ? (
        <CaseDetail riskCase={selectedCase} onClose={() => setSelectedCase(null)} />
      ) : null}
    </DashboardLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="app-card rounded-[22px] p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function MobileCaseCards({
  cases,
  onOpenDetail,
}: {
  cases: ApiRiskCase[];
  onOpenDetail: (riskCase: ApiRiskCase) => void;
}) {
  return (
    <div className="mt-5 space-y-3 lg:hidden">
      {cases.map((riskCase) => (
        <article
          key={riskCase.id}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-950">
                Caso #{riskCase.id}
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {getTransactionLabel(riskCase)}
              </p>
            </div>
            <StatusBadge status={riskCase.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <MobileFact label="Riesgo" value={<RiskBadge value={riskCase.riskLevelSnapshot} />} />
            <MobileFact label="Score" value={riskCase.scoreSnapshot} />
            <MobileFact label="Prioridad" value={<PriorityBadge priority={riskCase.priority} />} />
            <MobileFact label="Resultado" value={getResultLabel(riskCase)} />
            <MobileFact label="Responsable" value={getResponsibleName(riskCase)} />
            <MobileFact label="Fecha" value={formatDate(riskCase.updatedAt)} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenDetail(riskCase)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Detalle
            </button>
            <CaseActionLink riskCase={riskCase} onOpenDetail={onOpenDetail} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MobileFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
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
    <th
      className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function RiskBadge({ value }: { value?: string | null }) {
  const risk = value?.toUpperCase();
  const classes =
    risk === 'ALTO'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : risk === 'MEDIO'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : risk === 'BAJO'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes}`}>
      {formatRisk(value)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: RiskCasePriority }) {
  const classes: Record<RiskCasePriority, string> = {
    NORMAL: 'bg-slate-100 text-slate-700 ring-slate-200',
    ALTA: 'bg-amber-50 text-amber-700 ring-amber-100',
    URGENTE: 'bg-red-50 text-red-700 ring-red-100',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[priority]}`}>
      {formatPriority(priority)}
    </span>
  );
}

function StatusBadge({ status }: { status: RiskCaseStatus }) {
  const classes: Record<RiskCaseStatus, string> = {
    PENDIENTE: 'bg-amber-50 text-amber-700 ring-amber-100',
    EN_REVISION: 'bg-blue-50 text-blue-700 ring-blue-100',
    RESUELTO: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[status]}`}>
      {formatCaseStatus(status)}
    </span>
  );
}

function CaseActionLink({
  riskCase,
  onOpenDetail,
}: {
  riskCase: ApiRiskCase;
  onOpenDetail: (riskCase: ApiRiskCase) => void;
}) {
  if (riskCase.status === 'RESUELTO') {
    return (
      <button
        type="button"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        onClick={() => onOpenDetail(riskCase)}
      >
        Abrir caso
      </button>
    );
  }

  return (
    <Link
      to={`/case-management?transactionId=${riskCase.transactionId}`}
      className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
    >
      Abrir caso
    </Link>
  );
}

function LoadingRows() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton h-14 rounded-2xl" />
      ))}
    </div>
  );
}

function CaseDetail({
  riskCase,
  onClose,
}: {
  riskCase: ApiRiskCase;
  onClose: () => void;
}) {
  return (
    <DetailPanel
      icon={<FiBriefcase className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Detalle del caso"
      title={`Caso #${riskCase.id}`}
      badge={
        <DetailBadge tone={getCaseDetailTone(riskCase.status)}>
          {formatCaseStatus(riskCase.status)}
        </DetailBadge>
      }
      meta={`${getTransactionLabel(riskCase)} · Actualizado ${formatDate(riskCase.updatedAt)}`}
      onClose={onClose}
      footer={
        <Link
          to={`/case-management?transactionId=${riskCase.transactionId}`}
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          {riskCase.status === 'RESUELTO' ? 'Ver cierre' : 'Gestionar caso'}
        </Link>
      }
    >
      <DetailSection title="Resumen" tone={getCaseDetailTone(riskCase.status)}>
        <DetailGrid>
          <DetailField
            label="Transacción"
            value={getTransactionLabel(riskCase)}
          />
          <DetailField
            label="Estado"
            value={formatCaseStatus(riskCase.status)}
          />
          <DetailField
            label="Riesgo"
            value={formatRisk(riskCase.riskLevelSnapshot)}
          />
          <DetailField label="Score" value={`${riskCase.scoreSnapshot}/100`} />
          <DetailField
            label="Prioridad"
            value={formatPriority(riskCase.priority)}
          />
          <DetailField label="Resultado" value={getResultLabel(riskCase)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Identificación">
        <DetailGrid>
          <DetailField label="Caso" value={`#${riskCase.id}`} />
          <DetailField
            label="Responsable"
            value={getResponsibleName(riskCase)}
          />
          <DetailField label="Creado" value={formatDate(riskCase.createdAt)} />
          <DetailField
            label="Actualizado"
            value={formatDate(riskCase.updatedAt)}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Información operacional">
        <DetailGrid>
          <DetailField
            label="Análisis y antecedentes"
            value={riskCase.observations ?? 'No disponible'}
            wide
          />
          <DetailField
            label="Gestión realizada"
            value={riskCase.actionTaken ?? 'No disponible'}
            wide
          />
          <DetailField
            label="Motivo de clasificación"
            value={riskCase.classificationReason ?? 'No disponible'}
            wide
          />
          <DetailField
            label="Comentarios internos"
            value={riskCase.internalComments ?? 'No disponible'}
            wide
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Detalle completo o trazabilidad">
        {riskCase.timelineEvents?.length ? (
          <ol className="space-y-3">
            {riskCase.timelineEvents.map((event) => (
              <li key={event.id} className="border-l-2 border-blue-200 pl-3">
                <p className="break-words text-sm font-semibold text-slate-950">
                  {event.description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(event.createdAt)} ·{' '}
                  {event.user?.name ?? 'Sistema'}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <DetailNote>Este caso aún no registra eventos de trazabilidad.</DetailNote>
        )}
      </DetailSection>
    </DetailPanel>
  );
}

function getCaseDetailTone(status: RiskCaseStatus) {
  if (status === 'RESUELTO') return 'emerald' as const;
  if (status === 'EN_REVISION') return 'blue' as const;
  return 'amber' as const;
}

function formatCaseStatus(value?: string | null) {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revisión',
    RESUELTO: 'Resuelto',
  };

  return value ? labels[value] ?? value : 'No disponible';
}

function getResultLabel(riskCase: ApiRiskCase) {
  if (
    (riskCase.status === 'PENDIENTE' || riskCase.status === 'EN_REVISION') &&
    !riskCase.reviewResult
  ) {
    return 'Sin resultado';
  }

  return formatReviewResult(riskCase.reviewResult);
}

function formatReviewResult(value?: string | null) {
  const labels: Record<string, string> = {
    REQUIERE_ANTECEDENTES: 'Requiere antecedentes',
    SOSPECHA_DESCARTADA: 'Sospecha descartada',
    OPERACION_SOSPECHOSA: 'Operación sospechosa',
  };

  return value ? labels[value] ?? value : 'No disponible';
}

function formatPriority(value?: string | null) {
  const labels: Record<string, string> = {
    NORMAL: 'Normal',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  };

  return value ? labels[value] ?? value : 'No disponible';
}

function formatRisk(value?: string | null) {
  const labels: Record<string, string> = {
    ALTO: 'Alto',
    MEDIO: 'Medio',
    BAJO: 'Bajo',
  };

  return value ? labels[value.toUpperCase()] ?? value : 'No disponible';
}

function getTransactionLabel(riskCase: ApiRiskCase) {
  return riskCase.transaction?.transactionCode ?? `#${riskCase.transactionId}`;
}

function getResponsibleName(riskCase: ApiRiskCase) {
  return (
    riskCase.responsibleUser?.name ??
    riskCase.responsibleUser?.email ??
    riskCase.responsibleName ??
    'Sin asignar'
  );
}

function getPriorityWeight(value?: string | null) {
  const weights: Record<string, number> = {
    NORMAL: 1,
    ALTA: 2,
    URGENTE: 3,
  };

  return value ? weights[value] ?? 0 : 0;
}

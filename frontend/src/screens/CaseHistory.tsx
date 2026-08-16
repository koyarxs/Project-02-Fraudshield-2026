import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import riskCaseService from '../services/risk-case.service';
import type { ApiRiskCase } from '../types/transaction';
import { formatDate } from '../utils/formatDate';

const PAGE_SIZE = 10;

export default function CaseHistory() {
  const { user } = useAuth();
  const [cases, setCases] = useState<ApiRiskCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ApiRiskCase | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sortKey, setSortKey] = useState<
    'updatedAt' | 'priority' | 'scoreSnapshot'
  >('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [assignmentFilter, setAssignmentFilter] = useState<
    'TODOS' | 'MIS_CASOS' | 'SIN_ASIGNAR'
  >('TODOS');
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
        ]
          .join(' ')
          .toLowerCase();

        return (
          (!status || riskCase.status === status) &&
          (assignmentFilter === 'TODOS' ||
            (assignmentFilter === 'MIS_CASOS' &&
              riskCase.responsibleUserId === user?.id) ||
            (assignmentFilter === 'SIN_ASIGNAR' &&
              !riskCase.responsibleUserId)) &&
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
    assignmentFilter,
    cases,
    query,
    sortDirection,
    sortKey,
    status,
    user?.id,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleCases.length / PAGE_SIZE));
  const pagedCases = visibleCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [assignmentFilter, query, sortDirection, sortKey, status]);

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
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Historial de casos
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Trazabilidad de revisiones realizadas por analistas.
          </h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Pendientes" value={summary.pending} />
          <SummaryCard label="En revision" value={summary.inReview} />
          <SummaryCard label="Resueltos" value={summary.resolved} />
          <SummaryCard
            label="Alto pendientes"
            value={summary.highRiskPending}
          />
        </section>

        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-slate-950">
              Casos gestionados
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar caso, transaccion o responsable"
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_REVISION">En revision</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
              <select
                value={assignmentFilter}
                onChange={(event) =>
                  setAssignmentFilter(
                    event.target.value as
                      | 'TODOS'
                      | 'MIS_CASOS'
                      | 'SIN_ASIGNAR',
                  )
                }
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="TODOS">Todos</option>
                <option value="MIS_CASOS">Mis casos</option>
                <option value="SIN_ASIGNAR">Sin asignar</option>
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
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1050px] divide-y divide-slate-200 bg-white">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      'ID caso',
                      'ID transaccion',
                      'Riesgo',
                      'Score',
                      'Prioridad',
                      'Estado',
                      'Resultado',
                      'Responsable',
                      'Fecha',
                      'Acciones',
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
                  {pagedCases.map((riskCase) => (
                    <tr key={riskCase.id} className="align-top hover:bg-blue-50/40">
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-950">
                        #{riskCase.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        #{riskCase.transactionId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-700">
                        {riskCase.riskLevelSnapshot}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        {riskCase.scoreSnapshot}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-700">
                        {formatPriority(riskCase.priority)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        {formatCaseStatus(riskCase.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        {formatReviewResult(riskCase.reviewResult)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        {riskCase.responsibleName ?? 'No disponible'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                        {formatDate(riskCase.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCase(riskCase)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Detalle
                          </button>
                          <Link
                            to={`/case-management?transactionId=${riskCase.transactionId}`}
                            className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            Gestionar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    <div className="fixed inset-0 z-50 bg-slate-950/35 p-4 backdrop-blur-sm">
      <section className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Detalle del caso
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Caso #{riskCase.id}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
        <dl className="flex-1 overflow-y-auto divide-y divide-slate-200 p-5">
          <DetailRow label="Transaccion" value={`#${riskCase.transactionId}`} />
          <DetailRow label="Riesgo" value={riskCase.riskLevelSnapshot} />
          <DetailRow label="Score" value={String(riskCase.scoreSnapshot)} />
          <DetailRow label="Prioridad" value={formatPriority(riskCase.priority)} />
          <DetailRow label="Estado" value={formatCaseStatus(riskCase.status)} />
          <DetailRow
            label="Resultado"
            value={formatReviewResult(riskCase.reviewResult)}
          />
          <DetailRow
            label="Responsable"
            value={riskCase.responsibleName ?? 'No disponible'}
          />
          <DetailRow
            label="Observaciones"
            value={riskCase.observations ?? 'No disponible'}
          />
          <DetailRow
            label="Accion realizada"
            value={riskCase.actionTaken ?? 'No disponible'}
          />
          <DetailRow
            label="Comentarios internos"
            value={riskCase.internalComments ?? 'No disponible'}
          />
          <DetailRow
            label="Motivo clasificacion"
            value={riskCase.classificationReason ?? 'No disponible'}
          />
          <DetailRow label="Creado" value={formatDate(riskCase.createdAt)} />
          <DetailRow
            label="Actualizado"
            value={formatDate(riskCase.updatedAt)}
          />
          {riskCase.timelineEvents?.length ? (
            <div className="py-4">
              <dt className="text-sm text-slate-500">Timeline</dt>
              <dd className="mt-3 space-y-3">
                {riskCase.timelineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-2 border-blue-200 pl-3 text-sm"
                  >
                    <p className="font-semibold text-slate-950">
                      {event.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.createdAt)} ·{' '}
                      {event.user?.name ?? 'Sistema'}
                    </p>
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function formatCaseStatus(value?: string | null) {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revision',
    RESUELTO: 'Resuelto',
  };

  return value ? labels[value] ?? value : 'No disponible';
}

function formatReviewResult(value?: string | null) {
  const labels: Record<string, string> = {
    REQUIERE_ANTECEDENTES: 'Requiere antecedentes',
    SOSPECHA_DESCARTADA: 'Sospecha descartada',
    OPERACION_SOSPECHOSA: 'Operacion sospechosa',
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

function getPriorityWeight(value?: string | null) {
  const weights: Record<string, number> = {
    NORMAL: 1,
    ALTA: 2,
    URGENTE: 3,
  };

  return value ? weights[value] ?? 0 : 0;
}

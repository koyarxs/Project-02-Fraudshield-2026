import { type ReactNode, useEffect } from 'react';
import {
  FiArrowDown,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiShield,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import type { ProcessingBatch } from '../../types/processing';
import type { ApiRiskCase, ApiTransaction } from '../../types/transaction';
import { formatCurrencyCLP } from '../../utils/formatDate';
import {
  fallback,
  formatTransactionDateTime,
  getTransactionLocation,
  normalizeRiskLevel,
} from './transactionViewUtils';

interface TransactionDetailModalProps {
  transaction: ApiTransaction | null;
  batch: ProcessingBatch | null;
  onClose: () => void;
  onManageCase?: (transaction: ApiTransaction) => void;
}

export default function TransactionDetailModal({
  transaction,
  batch,
  onClose,
  onManageCase,
}: TransactionDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (transaction) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, transaction]);

  if (!transaction) {
    return null;
  }

  const riskLevel = normalizeRiskLevel(
    transaction.riskResult?.riskLevel?.name,
  );
  const explanation = transaction.riskResult?.ruleDetails;
  const ruleDetails =
    explanation?.evaluatedRules ?? explanation?.rules ?? [];
  const canManageCase = riskLevel === 'Medio' || riskLevel === 'Alto';
  const associatedCase = transaction.riskCases?.[0];
  const workflow = buildWorkflowState({
    riskLevel,
    score: transaction.riskResult?.score,
    associatedCase,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-detail-title"
    >
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Detalle de transacción
            </p>
            <h2
              id="transaction-detail-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              {fallback(transaction.transactionCode)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Cerrar detalle"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Código" value={transaction.transactionCode} />
          <DetailItem label="Cliente" value={transaction.customerCode} />
          <DetailItem
            label="Monto"
            value={formatCurrencyCLP(transaction.amount)}
          />
          <DetailItem
            label="Fecha y hora"
            value={formatTransactionDateTime(transaction)}
          />
          <DetailItem
            label="Ubicación"
            value={getTransactionLocation(transaction)}
          />
          <DetailItem
            label="Nivel de riesgo"
            value={riskLevel ? `Riesgo ${riskLevel}` : 'No disponible'}
          />
          <DetailItem
            label="Score"
            value={transaction.riskResult?.score}
          />
          <DetailItem
            label="Batch ID"
            value={`#${transaction.batchId}`}
          />
          <DetailItem
            label="Archivo de origen"
            value={batch?.fileName ?? 'No disponible'}
          />
          <div className="sm:col-span-2">
            <DetailItem
              label="Motivo final"
              value={
                explanation?.finalReason ??
                transaction.riskResult?.observation
              }
            />
          </div>
        </dl>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-950">
            Evaluacion de reglas R1-R5
          </h3>
          {ruleDetails.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {ruleDetails.map((rule) => (
                <li
                  key={rule.code}
                  className="rounded-2xl border border-white bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-slate-950">
                      {rule.code} - {rule.description}
                    </p>
                    <span
                      className={`text-xs font-bold ${
                        rule.activated ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {rule.activated ? 'Activada' : 'No activada'} · Score:{' '}
                      {rule.scoreImpact}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-600">
                    {rule.reason}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <div>
                      <dt className="font-bold text-slate-500">Condicion</dt>
                      <dd>{fallback(rule.condition)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-500">Valor observado</dt>
                      <dd>{fallback(rule.observedValue)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-500">Umbral</dt>
                      <dd>{fallback(rule.threshold)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {fallback(transaction.riskResult?.observation)}
            </p>
          )}
          {explanation?.algorithm ? (
            <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-900">
              {explanation.algorithm}
            </p>
          ) : null}
        </section>

        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-blue-950">
            Derivacion operacional
          </h3>
          <div className="mt-4 grid gap-3">
            <WorkflowStep
              icon={<FiShield className="h-4 w-4" aria-hidden="true" />}
              label="Clasificacion"
              value={workflow.classification}
              tone={workflow.tone}
            />
            <FlowArrow />
            <WorkflowStep
              icon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
              label="Accion recomendada"
              value={
                explanation?.recommendedAction ??
                getRiskActionText(riskLevel)
              }
              tone="blue"
            />
            <FlowArrow />
            <WorkflowStep
              icon={<FiClock className="h-4 w-4" aria-hidden="true" />}
              label="Estado del proceso"
              value={workflow.processState}
              tone={associatedCase ? 'blue' : workflow.tone}
            />
            <FlowArrow />
            <WorkflowStep
              icon={workflow.nextIcon}
              label="Siguiente accion"
              value={workflow.nextAction}
              tone={workflow.nextTone}
            />
          </div>
          {canManageCase && onManageCase ? (
            <button
              type="button"
              onClick={() => onManageCase(transaction)}
              className={[
                'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 sm:w-auto',
                riskLevel === 'Alto'
                  ? 'bg-red-700 shadow-red-700/20 hover:bg-red-800'
                  : 'bg-blue-700 shadow-blue-700/20 hover:bg-blue-800',
              ].join(' ')}
            >
              <FiBriefcase className="h-4 w-4" aria-hidden="true" />
              {workflow.buttonLabel}
            </button>
          ) : null}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-950">
            Caso asociado y trazabilidad
          </h3>
          {associatedCase ? (
            <div className="mt-3 space-y-4">
              <dl className="grid gap-3 sm:grid-cols-3">
                <DetailItem label="Caso" value={`#${associatedCase.id}`} />
                <DetailItem
                  label="Estado"
                  value={formatCaseStatus(associatedCase.status)}
                />
                <DetailItem
                  label="Prioridad"
                  value={formatPriority(associatedCase.priority)}
                />
                <DetailItem
                  label="Responsable"
                  value={associatedCase.responsibleName}
                />
                <DetailItem
                  label="Resultado"
                  value={formatReviewResult(associatedCase.reviewResult)}
                />
                <DetailItem
                  label="Actualizado"
                  value={associatedCase.updatedAt}
                />
              </dl>
              {associatedCase.timelineEvents?.length ? (
                <ol className="space-y-3">
                  {associatedCase.timelineEvents.map((event) => (
                    <li
                      key={event.id}
                      className="border-l-2 border-blue-200 pl-3 text-sm"
                    >
                      <p className="font-semibold text-slate-950">
                        {event.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.createdAt} · {event.user?.name ?? 'Sistema'}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Esta transacción aún no tiene un caso gestionado.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}

function formatCaseStatus(value?: string | null) {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_REVISION: 'En revisión',
    RESUELTO: 'Resuelto',
  };

  return value ? labels[value] ?? value : 'No disponible';
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">
        {fallback(value)}
      </dd>
    </div>
  );
}

function WorkflowStep({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
}) {
  const classes: Record<typeof tone, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    slate: 'border-slate-200 bg-white text-slate-700',
  };

  return (
    <div className={`rounded-2xl border p-4 ${classes[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">
            {label}
          </p>
          <p className="mt-1 text-sm font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center text-blue-700">
      <FiArrowDown className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

function getRiskActionText(riskLevel: ReturnType<typeof normalizeRiskLevel>) {
  if (riskLevel === 'Bajo') {
    return 'Registrar la clasificación y mantener la transacción disponible para monitoreo.';
  }

  if (riskLevel === 'Medio') {
    return 'Marcar la operación como caso que requiere revisión del analista.';
  }

  if (riskLevel === 'Alto') {
    return 'Marcar la operación como prioritaria y permitir iniciar una investigación del caso.';
  }

  return 'Clasificación no disponible para definir plan de acción.';
}

function buildWorkflowState({
  riskLevel,
  score,
  associatedCase,
}: {
  riskLevel: ReturnType<typeof normalizeRiskLevel>;
  score?: number;
  associatedCase?: ApiRiskCase;
}) {
  const scoreText = score !== undefined ? `Score ${score}/100` : 'Score N/D';

  if (riskLevel === 'Bajo') {
    return {
      classification: `RIESGO BAJO · ${scoreText}`,
      processState: 'Resultado registrado para monitoreo.',
      nextAction: 'Finalizar flujo sin investigacion obligatoria.',
      buttonLabel: 'Monitoreo',
      tone: 'emerald' as const,
      nextTone: 'emerald' as const,
      nextIcon: <FiCheckCircle className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (!associatedCase) {
    const isHigh = riskLevel === 'Alto';

    return {
      classification: `${isHigh ? 'RIESGO ALTO' : 'RIESGO MEDIO'} · ${scoreText}`,
      processState: isHigh
        ? 'Sin caso prioritario creado.'
        : 'Sin caso de revision creado.',
      nextAction: isHigh
        ? 'Crear caso prioritario y derivar a cola de investigacion.'
        : 'Iniciar revision y derivar a cola de casos.',
      buttonLabel: isHigh ? 'Gestionar caso prioritario' : 'Iniciar revision',
      tone: isHigh ? ('red' as const) : ('amber' as const),
      nextTone: isHigh ? ('red' as const) : ('amber' as const),
      nextIcon: isHigh ? (
        <FiBriefcase className="h-4 w-4" aria-hidden="true" />
      ) : (
        <FiSearch className="h-4 w-4" aria-hidden="true" />
      ),
    };
  }

  const hasResponsible =
    Boolean(associatedCase.responsibleUserId) ||
    Boolean(
      associatedCase.responsibleName &&
        associatedCase.responsibleName !== 'Sin asignar',
    );

  if (associatedCase.status === 'PENDIENTE') {
    return {
      classification: `${riskLevel ? `RIESGO ${riskLevel.toUpperCase()}` : 'RIESGO'} · ${scoreText}`,
      processState: `Caso #${associatedCase.id} creado · Pendiente`,
      nextAction: hasResponsible
        ? 'Iniciar revision del analista.'
        : 'Pendiente de asignacion.',
      buttonLabel: hasResponsible ? 'Iniciar investigacion' : 'Asignar analista',
      tone: riskLevel === 'Alto' ? ('red' as const) : ('amber' as const),
      nextTone: hasResponsible ? ('blue' as const) : ('amber' as const),
      nextIcon: hasResponsible ? (
        <FiSearch className="h-4 w-4" aria-hidden="true" />
      ) : (
        <FiUserPlus className="h-4 w-4" aria-hidden="true" />
      ),
    };
  }

  if (associatedCase.status === 'EN_REVISION') {
    return {
      classification: `${riskLevel ? `RIESGO ${riskLevel.toUpperCase()}` : 'RIESGO'} · ${scoreText}`,
      processState: `Caso #${associatedCase.id} en revision`,
      nextAction: 'Registrar decision y resolver cuando corresponda.',
      buttonLabel: 'Registrar decision',
      tone: riskLevel === 'Alto' ? ('red' as const) : ('amber' as const),
      nextTone: 'blue' as const,
      nextIcon: <FiSearch className="h-4 w-4" aria-hidden="true" />,
    };
  }

  return {
    classification: `${riskLevel ? `RIESGO ${riskLevel.toUpperCase()}` : 'RIESGO'} · ${scoreText}`,
    processState: `Caso #${associatedCase.id} resuelto`,
    nextAction: formatReviewResult(associatedCase.reviewResult),
    buttonLabel: 'Ver caso resuelto',
    tone: 'slate' as const,
    nextTone: 'emerald' as const,
    nextIcon: <FiCheckCircle className="h-4 w-4" aria-hidden="true" />,
  };
}

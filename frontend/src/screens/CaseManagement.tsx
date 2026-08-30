import axios from 'axios';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiShield,
  FiUserCheck,
} from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import riskCaseService from '../services/risk-case.service';
import transactionService from '../services/transaction.service';
import userService, { type ApiUser } from '../services/user.service';
import type {
  ApiRiskCase,
  ApiRiskCaseTimeline,
  ApiTransaction,
  RiskCasePriority,
  RiskCaseReviewResult,
  RiskCaseStatus,
  RiskRuleDetail,
} from '../types/transaction';
import { formatCurrencyCLP, formatDate } from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';

const AUTHORIZED_RESPONSIBLES: Record<string, string> = {
  'yerko@fraudshield.cl':
    'Analista de Riesgo Transaccional - Yerko Barrera',
  'admin@fraudshield.cl': 'Administrador - FraudShield',
};

const resultOptions: Array<{ label: string; value: RiskCaseReviewResult }> = [
  { label: 'Requiere antecedentes', value: 'REQUIERE_ANTECEDENTES' },
  { label: 'Sospecha descartada', value: 'SOSPECHA_DESCARTADA' },
  { label: 'Operación sospechosa', value: 'OPERACION_SOSPECHOSA' },
];

const priorityOptions: Array<{ label: string; value: RiskCasePriority }> = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Alta', value: 'ALTA' },
  { label: 'Urgente', value: 'URGENTE' },
];

const statusTone: Record<RiskCaseStatus, string> = {
  PENDIENTE: 'border-amber-200 bg-amber-50 text-amber-800',
  EN_REVISION: 'border-blue-200 bg-blue-50 text-blue-800',
  RESUELTO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const priorityTone: Record<RiskCasePriority, string> = {
  NORMAL: 'border-slate-200 bg-slate-50 text-slate-700',
  ALTA: 'border-red-200 bg-red-50 text-red-700',
  URGENTE: 'border-red-300 bg-red-100 text-red-800',
};

export default function CaseManagement() {
  const { user } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const [searchParams] = useSearchParams();
  const transactionId = Number(searchParams.get('transactionId'));
  const [transaction, setTransaction] = useState<ApiTransaction | null>(null);
  const [riskCase, setRiskCase] = useState<ApiRiskCase | null>(null);
  const [status, setStatus] = useState<RiskCaseStatus>('PENDIENTE');
  const [priority, setPriority] = useState<RiskCasePriority>('NORMAL');
  const [reviewResult, setReviewResult] =
    useState<RiskCaseReviewResult>('REQUIERE_ANTECEDENTES');
  const [observations, setObservations] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [internalComments, setInternalComments] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('0');
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCaseContext() {
      if (!Number.isFinite(transactionId) || transactionId <= 0) {
        setError('No se indicó una transacción válida para gestionar.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const transactions = await transactionService.findAll();
        const currentTransaction =
          transactions.find((item) => item.id === transactionId) ?? null;

        if (!currentTransaction) {
          throw new Error('Transacción no encontrada.');
        }

        const currentCase =
          await riskCaseService.findByTransaction(transactionId);
        if (!isAdministrator && !currentCase) {
          throw new Error(
            'No tienes un caso asignado para esta transacción.',
          );
        }

        const availableUsers = await userService.findAssignable();
        const authorizedUsers = getAuthorizedUsers(availableUsers);
        const currentResponsibleId = currentCase?.responsibleUserId
          ? String(currentCase.responsibleUserId)
          : '0';
        const isCurrentResponsibleAllowed = authorizedUsers.some(
          (user) => String(user.id) === currentResponsibleId,
        );

        if (!shouldIgnore) {
          setTransaction(currentTransaction);
          setRiskCase(currentCase);
          setStatus(currentCase?.status ?? 'PENDIENTE');
          setPriority(
            currentCase?.priority ??
              (currentTransaction.riskResult?.riskLevel?.name === 'ALTO'
                ? 'ALTA'
                : 'NORMAL'),
          );
          setReviewResult(
            currentCase?.reviewResult ?? 'REQUIERE_ANTECEDENTES',
          );
          setObservations(currentCase?.observations ?? '');
          setActionTaken(currentCase?.actionTaken ?? '');
          setInternalComments(currentCase?.internalComments ?? '');
          setResponsibleUserId(
            isCurrentResponsibleAllowed ? currentResponsibleId : '0',
          );
          setUsers(availableUsers);
        }
      } catch (loadError) {
        if (!shouldIgnore) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadCaseContext();

    return () => {
      shouldIgnore = true;
    };
  }, [isAdministrator, transactionId, user]);

  const authorizedUsers = useMemo(() => getAuthorizedUsers(users), [users]);
  const selectedUser = useMemo(
    () => authorizedUsers.find((user) => String(user.id) === responsibleUserId),
    [authorizedUsers, responsibleUserId],
  );
  const currentRiskLevel = transaction?.riskResult?.riskLevel?.name ?? '';
  const recommendedAction =
    transaction?.riskResult?.ruleDetails?.recommendedAction ??
    getRecommendedAction(currentRiskLevel);
  const ruleDetails = useMemo(() => getRuleDetails(transaction), [transaction]);
  const activatedRules = ruleDetails.filter((rule) => rule.activated);
  const inactiveRules = ruleDetails.filter((rule) => !rule.activated);
  const hasPersistedResponsible = Boolean(riskCase?.responsibleUserId);
  const hasSelectedResponsible = Boolean(selectedUser);
  const hasAnalysis = Boolean(observations.trim());
  const hasManagement = Boolean(actionTaken.trim());
  const hasFinalResult = reviewResult !== 'REQUIERE_ANTECEDENTES';
  const isCaseClosed = riskCase?.status === 'RESUELTO';
  const hasCompleteReview = hasAnalysis && hasManagement && hasFinalResult;
  const canAdministratorClose =
    isAdministrator &&
    status === 'EN_REVISION' &&
    riskCase?.responsibleUser?.role === 'ADMINISTRADOR' &&
    hasAnalysis &&
    hasManagement &&
    hasFinalResult;
  const submitLabel = getSubmitLabel({
    isAdministrator,
    isCaseClosed,
    persistedStatus: riskCase?.status,
    hasPersistedResponsible,
    hasCompleteReview,
    canAdministratorClose,
    selectedRole: selectedUser?.role,
    currentResponsibleRole: riskCase?.responsibleUser?.role,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!transaction) {
      setError('No existe una transacción cargada para gestionar.');
      return;
    }

    if (isCaseClosed) {
      return;
    }


    if (!selectedUser) {
      setError('Selecciona un responsable autorizado antes de avanzar el caso.');
      return;
    }

    const shouldAdministratorClose = Boolean(
      canAdministratorClose &&
        selectedUser.role === 'ADMINISTRADOR' &&
        selectedUser.id === riskCase?.responsibleUserId,
    );
    const shouldAnalystResolve = Boolean(
      !isAdministrator &&
        status === 'EN_REVISION' &&
        hasCompleteReview,
    );

    const nextStatus = isAdministrator
      ? shouldAdministratorClose
        ? 'RESUELTO'
        : (riskCase?.status ?? 'PENDIENTE')
      : shouldAnalystResolve
        ? 'RESUELTO'
        : getNextStatus({
            selectedStatus: status,
            persistedStatus: riskCase?.status,
            hasPersistedResponsible,
          });

    if (nextStatus === 'RESUELTO') {
      const missing = getResolutionMissingFields({
        hasSelectedResponsible,
        hasAnalysis,
        hasManagement,
        hasFinalResult,
      });

      if (missing) {
        setError(missing);
        return;
      }

      const confirmed = window.confirm(
        '¿Confirmas el cierre del caso? Esta acción dejará la revisión como resuelta.',
      );

      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = isAdministrator
        ? {
            transactionId: transaction.id,
            status: nextStatus,
            priority,
            responsibleUserId: Number(responsibleUserId),
          }
        : {
            transactionId: transaction.id,
            status: nextStatus,
            reviewResult,
            observations: observations.trim(),
            actionTaken: actionTaken.trim(),
            internalComments: internalComments.trim(),
          };
      const savedCase = riskCase
        ? await riskCaseService.update(riskCase.id, payload)
        : await riskCaseService.create(payload);

      setRiskCase(savedCase);
      setStatus(savedCase.status);
      setPriority(savedCase.priority);
      setReviewResult(savedCase.reviewResult ?? 'REQUIERE_ANTECEDENTES');
      setObservations(savedCase.observations ?? '');
      setActionTaken(savedCase.actionTaken ?? '');
      setInternalComments(savedCase.internalComments ?? '');
      setResponsibleUserId(
        savedCase.responsibleUserId ? String(savedCase.responsibleUserId) : '0',
      );
      setSuccessMessage(
        getSuccessMessage(
          nextStatus,
          hasPersistedResponsible,
          isAdministrator,
        ),
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {isLoading ? (
          <LoadingState />
        ) : error && !transaction ? (
          <Message tone="error">{error}</Message>
        ) : transaction ? (
          <>
            <Link
              to="/case-history"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 focus:outline-none focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a Gestión de casos
            </Link>

            <CaseHeader
              transaction={transaction}
              riskCase={riskCase}
              status={status}
              priority={priority}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <TransactionSummary
                transaction={transaction}
                recommendedAction={recommendedAction}
              />

              <section className="order-2 space-y-4 xl:order-none">
                <StageTracker
                  status={isCaseClosed ? 'RESUELTO' : status}
                  hasResponsible={hasSelectedResponsible}
                  hasAnalysis={hasAnalysis}
                  hasManagement={hasManagement}
                  hasFinalResult={hasFinalResult}
                />
                {isCaseClosed ? (
                  <ResolvedCasePanel
                    riskCase={riskCase}
                    responsible={selectedUser}
                    reviewResult={reviewResult}
                    observations={observations}
                    actionTaken={actionTaken}
                  />
                ) : (
                  <CaseManagementForm
                    status={status}
                    priority={priority}
                    reviewResult={reviewResult}
                    observations={observations}
                    actionTaken={actionTaken}
                    internalComments={internalComments}
                    responsibleUserId={responsibleUserId}
                    authorizedUsers={authorizedUsers}
                    selectedUser={selectedUser}
                    isSaving={isSaving}
                    submitLabel={submitLabel}
                    error={error}
                    successMessage={successMessage}
                    isAdministrator={isAdministrator}
                    onPriorityChange={setPriority}
                    onReviewResultChange={setReviewResult}
                    onObservationsChange={setObservations}
                    onActionTakenChange={setActionTaken}
                    onInternalCommentsChange={setInternalComments}
                    onResponsibleChange={setResponsibleUserId}
                    onSubmit={handleSubmit}
                  />
                )}
              </section>
            </div>

            <RulesPanel
              activatedRules={activatedRules}
              inactiveRules={inactiveRules}
              fallbackReason={
                transaction.riskResult?.ruleDetails?.finalReason ??
                transaction.riskResult?.observation
              }
            />
            <TimelinePanel events={riskCase?.timelineEvents ?? []} />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function CaseHeader({
  transaction,
  riskCase,
  status,
  priority,
}: {
  transaction: ApiTransaction;
  riskCase: ApiRiskCase | null;
  status: RiskCaseStatus;
  priority: RiskCasePriority;
}) {
  const riskLevel = transaction.riskResult?.riskLevel?.name ?? 'No disponible';

  return (
    <section className="module-sticky-header app-card rounded-[20px] p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <HeaderFact label="Transacción" value={transaction.transactionCode} />
        <HeaderFact
          label="Nivel de riesgo"
          value={<RiskPill level={riskLevel} />}
        />
        <HeaderFact label="Score" value={transaction.riskResult?.score ?? 'N/D'} />
        <HeaderFact
          label="Estado del caso"
          value={<StatusPill status={status} />}
        />
        <HeaderFact
          label="Prioridad"
          value={<PriorityPill priority={riskCase?.priority ?? priority} />}
        />
      </div>
    </section>
  );
}

function TransactionSummary({
  transaction,
  recommendedAction,
}: {
  transaction: ApiTransaction;
  recommendedAction: string;
}) {
  return (
    <section className="order-1 space-y-4 xl:order-none">
      <div className="app-card rounded-[20px] p-4 lg:p-5">
        <SectionTitle
          eyebrow="Resumen"
          title="Transacción asociada"
          icon={<FiShield className="h-4 w-4" aria-hidden="true" />}
        />
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Código" value={transaction.transactionCode} />
          <DetailItem label="Cliente" value={transaction.customerCode} />
          <DetailItem
            label="Monto"
            value={formatCurrencyCLP(transaction.amount)}
          />
          <DetailItem
            label="Fecha y hora"
            value={`${formatDate(transaction.transactionDate)} · ${transaction.transactionHour}`}
          />
          <DetailItem
            label="Origen"
            value={transaction.originLocation ?? 'No disponible'}
          />
          <DetailItem
            label="Destino"
            value={transaction.destinationLocation ?? 'No disponible'}
          />
        </dl>
      </div>

      <div className="app-card rounded-[20px] p-4 lg:p-5">
        <SectionTitle
          eyebrow="Criterio"
          title="Motivo y acción sugerida"
          icon={<FiFileText className="h-4 w-4" aria-hidden="true" />}
        />
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {transaction.riskResult?.ruleDetails?.finalReason ??
            transaction.riskResult?.observation ??
            'No disponible'}
        </p>
        <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {recommendedAction}
        </p>
      </div>
    </section>
  );
}

function StageTracker({
  status,
  hasResponsible,
  hasAnalysis,
  hasManagement,
  hasFinalResult,
}: {
  status: RiskCaseStatus;
  hasResponsible: boolean;
  hasAnalysis: boolean;
  hasManagement: boolean;
  hasFinalResult: boolean;
}) {
  const stages = getStages({
    status,
    hasResponsible,
    hasAnalysis,
    hasManagement,
    hasFinalResult,
  });

  return (
    <section className="app-card rounded-[20px] p-4 lg:p-5">
      <SectionTitle
        eyebrow="Flujo"
        title="Asignación → Revisión → Decisión → Cierre"
        icon={<FiClock className="h-4 w-4" aria-hidden="true" />}
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {stages.map((stage, index) => (
          <article
            key={stage.label}
            className={[
              'rounded-xl border px-3 py-2.5',
              stage.state === 'completed'
                ? 'border-slate-200 bg-white text-slate-600'
                : stage.state === 'current'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500',
            ].join(' ')}
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Etapa {index + 1}
            </p>
            <p className="mt-1 text-sm font-bold">{stage.label}</p>
            <p className="mt-0.5 text-xs">{stage.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CaseManagementForm({
  status,
  priority,
  reviewResult,
  observations,
  actionTaken,
  internalComments,
  responsibleUserId,
  authorizedUsers,
  selectedUser,
  isSaving,
  submitLabel,
  error,
  successMessage,
  isAdministrator,
  onPriorityChange,
  onReviewResultChange,
  onObservationsChange,
  onActionTakenChange,
  onInternalCommentsChange,
  onResponsibleChange,
  onSubmit,
}: {
  status: RiskCaseStatus;
  priority: RiskCasePriority;
  reviewResult: RiskCaseReviewResult;
  observations: string;
  actionTaken: string;
  internalComments: string;
  responsibleUserId: string;
  authorizedUsers: ApiUser[];
  selectedUser?: ApiUser;
  isSaving: boolean;
  submitLabel: string;
  error: string;
  successMessage: string;
  isAdministrator: boolean;
  onPriorityChange: (value: RiskCasePriority) => void;
  onReviewResultChange: (value: RiskCaseReviewResult) => void;
  onObservationsChange: (value: string) => void;
  onActionTakenChange: (value: string) => void;
  onInternalCommentsChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="app-card rounded-[20px] p-4 lg:p-5">
      <SectionTitle
        eyebrow="Gestión"
        title="Registro del caso"
        icon={<FiUserCheck className="h-4 w-4" aria-hidden="true" />}
      />

      <div className="mt-4 space-y-3">
        {isAdministrator ? (
          <>
          <FormSection title="Prioridad">
            <SegmentedChoices
              value={priority}
              options={priorityOptions}
              toneMap={priorityTone}
              onChange={(value) => onPriorityChange(value as RiskCasePriority)}
            />
          </FormSection>

          <FormSection title="Responsable">
            <SelectField
              label="Responsable asignado"
              value={responsibleUserId}
              options={[
                { label: 'Sin asignar', value: '0' },
                ...authorizedUsers.map((user) => ({
                  label: getAuthorizedUserName(user),
                  value: String(user.id),
                })),
              ]}
              onChange={onResponsibleChange}
            />
            <p className="text-xs leading-5 text-slate-500">
              El responsable asignado realizará la revisión y registrará la decisión final.
            </p>
          </FormSection>

          {status === 'EN_REVISION' && (observations || actionTaken) ? (
            <FormSection title="Resolución propuesta">
              <ReadOnlyBlock
                title="Análisis y antecedentes"
                value={observations}
              />
              <ReadOnlyBlock title="Gestión realizada" value={actionTaken} />
              <ReadOnlyBlock
                title="Resultado informado"
                value={formatReviewResult(reviewResult)}
              />
              {reviewResult === 'REQUIERE_ANTECEDENTES' ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  El Analista indicó que faltan antecedentes. Devuelve el caso para continuar la revisión.
                </p>
              ) : null}
            </FormSection>
          ) : null}

          </>
        ) : (
          <>
            {selectedUser ? (
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                Responsable: {getAuthorizedUserName(selectedUser)}
              </p>
            ) : null}

            {status === 'EN_REVISION' ? (
              <>
                <FormSection title="Análisis y antecedentes">
                  <TextArea
                    label="Análisis y antecedentes"
                    hideLabel
                    value={observations}
                    onChange={onObservationsChange}
                    placeholder="Registra los antecedentes revisados y el criterio aplicado."
                  />
                </FormSection>

                <FormSection title="Gestión realizada">
                  <TextArea
                    label="Gestión realizada"
                    hideLabel
                    value={actionTaken}
                    onChange={onActionTakenChange}
                    placeholder="Describe la acción realizada, solicitud de antecedentes o validación interna."
                  />
                </FormSection>

                <FormSection title="Resultado final">
                  <SegmentedChoices
                    value={reviewResult}
                    options={resultOptions}
                    onChange={(value) =>
                      onReviewResultChange(value as RiskCaseReviewResult)
                    }
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Para cerrar el caso selecciona una decisión final distinta de “Requiere antecedentes”.
                  </p>
                </FormSection>

                <details className="rounded-xl bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-slate-800">
                    Agregar notas internas
                  </summary>
                  <div className="mt-3">
                    <TextArea
                      label="Notas internas"
                      value={internalComments}
                      onChange={onInternalCommentsChange}
                      placeholder="Notas operacionales visibles para auditoría interna del caso."
                    />
                  </div>
                </details>
              </>
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-800">
                Inicia la revisión para registrar el análisis, la gestión y la decisión final.
              </p>
            )}
          </>
        )}
      </div>

      {error ? <Message tone="error">{error}</Message> : null}
      {successMessage ? <Message tone="success">{successMessage}</Message> : null}

      <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-40"
        >
          {isSaving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ResolvedCasePanel({
  riskCase,
  responsible,
  reviewResult,
  observations,
  actionTaken,
}: {
  riskCase: ApiRiskCase | null;
  responsible?: ApiUser;
  reviewResult: RiskCaseReviewResult;
  observations: string;
  actionTaken: string;
}) {
  return (
    <section id="case-close" className="app-card rounded-[20px] p-4 lg:p-5">
      <SectionTitle
        eyebrow="Cierre"
        title="Caso resuelto"
        icon={<FiCheckCircle className="h-4 w-4" aria-hidden="true" />}
      />
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem
          label="Responsable"
          value={
            responsible
              ? getAuthorizedUserName(responsible)
              : riskCase?.responsibleName ?? 'Sin asignar'
          }
        />
        <DetailItem label="Resultado final" value={formatReviewResult(reviewResult)} />
        <DetailItem
          label="Fecha de cierre"
          value={riskCase?.resolvedAt ? formatDate(riskCase.resolvedAt) : 'No disponible'}
        />
        <DetailItem
          label="Actualización"
          value={riskCase?.updatedAt ? formatDate(riskCase.updatedAt) : 'No disponible'}
        />
      </dl>
      <ReadOnlyBlock title="Análisis y antecedentes" value={observations} />
      <ReadOnlyBlock title="Gestión realizada" value={actionTaken} />
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="#case-close"
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
        >
          Ver cierre
        </a>
        <a
          href="#case-timeline"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Ver trazabilidad
        </a>
      </div>
    </section>
  );
}

function RulesPanel({
  activatedRules,
  inactiveRules,
  fallbackReason,
}: {
  activatedRules: RiskRuleDetail[];
  inactiveRules: RiskRuleDetail[];
  fallbackReason?: string | null;
}) {
  return (
    <section className="order-4 app-card rounded-[20px] p-4 lg:p-5 xl:order-none">
      <SectionTitle
        eyebrow="Reglas R1-R5"
        title="Explicación aplicada"
        icon={<FiFileText className="h-4 w-4" aria-hidden="true" />}
      />
      {fallbackReason ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">{fallbackReason}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {activatedRules.length > 0 ? (
          activatedRules.map((rule) => (
            <span
              key={rule.code}
              className="rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white"
            >
              {rule.code} · {rule.name}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            Sin reglas críticas activadas
          </span>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">
          Ver detalle técnico de reglas
        </summary>
        <div className="mt-4 space-y-3">
          {activatedRules.map((rule) => (
            <RuleCard key={rule.code} rule={rule} />
          ))}
          {inactiveRules.map((rule) => (
            <RuleCard key={rule.code} rule={rule} compact />
          ))}
        </div>
      </details>
    </section>
  );
}

function TimelinePanel({ events }: { events: ApiRiskCaseTimeline[] }) {
  return (
    <section
      id="case-timeline"
      className="order-5 app-card rounded-[20px] p-4 lg:p-5 xl:order-none"
    >
      <SectionTitle
        eyebrow="Trazabilidad"
        title="Eventos del caso"
        icon={<FiClock className="h-4 w-4" aria-hidden="true" />}
      />
      {events.length ? (
        <ol className="mt-5 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-semibold text-slate-950">
                {formatTimelineDescription(event.description)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(event.createdAt)} · {event.user?.name ?? 'Sistema'}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Aún no hay eventos registrados para este caso.
        </p>
      )}
    </section>
  );
}

function RuleCard({
  rule,
  compact = false,
}: {
  rule: RiskRuleDetail;
  compact?: boolean;
}) {
  const content = (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {rule.code} · {rule.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {rule.description}
          </p>
        </div>
        <span
          className={[
            'w-fit rounded-full px-3 py-1 text-xs font-bold',
            rule.activated
              ? 'bg-blue-700 text-white'
              : 'bg-white text-slate-500 ring-1 ring-slate-200',
          ].join(' ')}
        >
          {rule.activated ? 'Activada' : 'No activada'} · {rule.scoreImpact} pts
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <RuleDetail label="Condición" value={rule.condition} />
        <RuleDetail label="Valor observado" value={rule.observedValue} />
        <RuleDetail label="Umbral" value={rule.threshold} />
      </dl>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-bold text-blue-700">
          Ver detalle técnico
        </summary>
        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600">
          {rule.reason || rule.condition || 'No disponible'}
        </p>
      </details>
    </>
  );

  return (
    <article
      className={[
        'rounded-xl border p-3.5',
        compact
          ? 'border-slate-200 bg-white'
          : 'border-blue-200 bg-blue-50',
      ].join(' ')}
    >
      {content}
    </article>
  );
}

function HeaderFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 truncate text-sm font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-slate-950">{title}</h2>
      </div>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-slate-50 p-3">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value ?? 'No disponible'}
      </dd>
    </div>
  );
}

function RuleDetail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">
        {value && value.trim() ? value : 'No disponible'}
      </dd>
    </div>
  );
}

function ReadOnlyBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="mt-4 rounded-xl bg-slate-50 p-3">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {value || 'No disponible'}
      </p>
    </section>
  );
}

function SegmentedChoices({
  value,
  options,
  toneMap = {},
  disabledValues = [],
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  toneMap?: Record<string, string>;
  disabledValues?: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = disabledValues.includes(option.value);
        const selectedClasses =
          toneMap[option.value] ?? 'border-blue-200 bg-blue-50 text-blue-800';

        return (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(option.value)}
            className={[
              'min-h-9 rounded-xl border px-3 py-1.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
              isDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : isSelected
                  ? selectedClasses
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  hideLabel = false,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`${hideLabel ? '' : 'mt-2 '}w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100`}
      />
    </label>
  );
}

function RiskPill({ level }: { level: string }) {
  const normalized = level.toUpperCase();
  const classes =
    normalized === 'ALTO'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : normalized === 'MEDIO'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-100';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes}`}>
      {formatRiskLevel(level)}
    </span>
  );
}

function StatusPill({ status }: { status: RiskCaseStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone[status]}`}>
      {formatCaseStatus(status)}
    </span>
  );
}

function PriorityPill({ priority }: { priority: RiskCasePriority }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${priorityTone[priority]}`}>
      {formatPriority(priority)}
    </span>
  );
}

function LoadingState() {
  return (
    <section className="app-card rounded-[24px] p-5">
      <div className="skeleton h-5 w-56 rounded-full" />
      <div className="skeleton mt-5 h-64 rounded-2xl" />
    </section>
  );
}

function Message({
  tone,
  children,
}: {
  tone: 'error' | 'success';
  children: string;
}) {
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${classes}`}>
      {children}
    </p>
  );
}

function getAuthorizedUsers(users: ApiUser[]) {
  return users.filter((user) =>
    Boolean(
      user.active &&
        AUTHORIZED_RESPONSIBLES[user.email.toLowerCase()],
    ),
  );
}

function getAuthorizedUserName(user: ApiUser) {
  return AUTHORIZED_RESPONSIBLES[user.email.toLowerCase()] ?? user.name;
}

function getRuleDetails(transaction: ApiTransaction | null) {
  const explanation = transaction?.riskResult?.ruleDetails;

  return explanation?.evaluatedRules?.length
    ? explanation.evaluatedRules
    : (explanation?.rules ?? []);
}

function getStages({
  status,
  hasResponsible,
  hasAnalysis,
  hasManagement,
  hasFinalResult,
}: {
  status: RiskCaseStatus;
  hasResponsible: boolean;
  hasAnalysis: boolean;
  hasManagement: boolean;
  hasFinalResult: boolean;
}) {
  const isResolved = status === 'RESUELTO';
  const reviewComplete = hasAnalysis && hasManagement;

  return [
    {
      label: 'Asignación',
      description: hasResponsible ? 'Responsable definido' : 'Pendiente',
      state: hasResponsible || isResolved ? 'completed' : 'current',
    },
    {
      label: 'Revisión',
      description: reviewComplete ? 'Análisis registrado' : 'En preparación',
      state: isResolved
        ? 'completed'
        : status === 'EN_REVISION'
          ? reviewComplete
            ? 'completed'
            : 'current'
          : hasResponsible
            ? 'current'
            : 'pending',
    },
    {
      label: 'Decisión',
      description: hasFinalResult ? 'Resultado definido' : 'Sin decisión final',
      state: isResolved
        ? 'completed'
        : status === 'EN_REVISION' && reviewComplete
          ? 'current'
          : 'pending',
    },
    {
      label: 'Cierre',
      description: isResolved ? 'Caso cerrado' : 'Pendiente de cierre',
      state: isResolved ? 'current' : 'pending',
    },
  ];
}

function getSubmitLabel({
  isAdministrator,
  isCaseClosed,
  persistedStatus,
  hasPersistedResponsible,
  hasCompleteReview,
  canAdministratorClose,
  selectedRole,
  currentResponsibleRole,
}: {
  isAdministrator: boolean;
  isCaseClosed: boolean;
  persistedStatus?: RiskCaseStatus;
  hasPersistedResponsible: boolean;
  hasCompleteReview: boolean;
  canAdministratorClose: boolean;
  selectedRole?: ApiUser['role'];
  currentResponsibleRole?: ApiUser['role'];
}) {
  if (isCaseClosed) {
    return 'Caso resuelto';
  }

  if (isAdministrator) {
    if (
      canAdministratorClose &&
      currentResponsibleRole === 'ADMINISTRADOR' &&
      selectedRole === 'ADMINISTRADOR'
    ) {
      return 'Cerrar caso';
    }

    if (
      currentResponsibleRole === 'ADMINISTRADOR' &&
      selectedRole === 'ANALISTA'
    ) {
      return 'Devolver al Analista';
    }

    return 'Asignar caso';
  }

  if (!hasPersistedResponsible) {
    return 'Asignar caso';
  }

  if (persistedStatus === 'PENDIENTE') {
    return 'Iniciar revisión';
  }

  return hasCompleteReview ? 'Resolver caso' : 'Guardar revisión';
}

function getNextStatus({
  selectedStatus,
  persistedStatus,
  hasPersistedResponsible,
}: {
  selectedStatus: RiskCaseStatus;
  persistedStatus?: RiskCaseStatus;
  hasPersistedResponsible: boolean;
}): RiskCaseStatus {
  if (!hasPersistedResponsible) {
    return 'PENDIENTE';
  }

  if (persistedStatus === 'PENDIENTE') {
    return 'EN_REVISION';
  }

  return selectedStatus;
}

function getResolutionMissingFields({
  hasSelectedResponsible,
  hasAnalysis,
  hasManagement,
  hasFinalResult,
}: {
  hasSelectedResponsible: boolean;
  hasAnalysis: boolean;
  hasManagement: boolean;
  hasFinalResult: boolean;
}) {
  if (!hasSelectedResponsible) {
    return 'Selecciona un responsable autorizado antes de resolver el caso.';
  }

  if (!hasAnalysis) {
    return 'Registra el análisis y antecedentes antes de resolver el caso.';
  }

  if (!hasManagement) {
    return 'Registra la gestión realizada antes de resolver el caso.';
  }

  if (!hasFinalResult) {
    return 'Selecciona un resultado final antes de resolver el caso.';
  }

  return '';
}

function getSuccessMessage(
  nextStatus: RiskCaseStatus,
  hadPersistedResponsible: boolean,
  isAdministrator: boolean,
) {
  if (nextStatus === 'RESUELTO') {
    return 'Caso cerrado correctamente.';
  }

  if (isAdministrator) {
    return hadPersistedResponsible
      ? 'Asignación actualizada correctamente.'
      : 'Caso asignado correctamente.';
  }

  if (!hadPersistedResponsible) {
    return 'Caso asignado correctamente.';
  }

  if (nextStatus === 'EN_REVISION') {
    return 'Revisión iniciada correctamente.';
  }

  return 'Revisión guardada correctamente.';
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

function formatRiskLevel(value?: string | null) {
  const labels: Record<string, string> = {
    ALTO: 'Riesgo alto',
    MEDIO: 'Riesgo medio',
    BAJO: 'Riesgo bajo',
  };

  return value ? labels[value.toUpperCase()] ?? value : 'No disponible';
}

function formatTimelineDescription(description?: string | null) {
  if (!description) {
    return 'Evento registrado en el caso.';
  }

  return description
    .replaceAll('CASE_UPSERTED', 'Caso actualizado')
    .replaceAll('STATUS_CHANGED', 'Cambio de estado')
    .replaceAll('REVIEW_UPDATED', 'Revisión actualizada');
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      'No fue posible completar la operación solicitada.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No fue posible completar la operación solicitada.';
}

function getRecommendedAction(riskLevel: string) {
  const normalized = riskLevel.toUpperCase();

  if (normalized === 'BAJO') {
    return 'Registrar y monitorear.';
  }

  if (normalized === 'MEDIO') {
    return 'Requiere revisión del analista.';
  }

  if (normalized === 'ALTO') {
    return 'Revisión prioritaria.';
  }

  return 'No disponible';
}

import axios from 'axios';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFlag,
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
  ApiTransaction,
  RiskCasePriority,
  RiskCaseReviewResult,
  RiskCaseStatus,
} from '../types/transaction';
import { formatCurrencyCLP, formatDate } from '../utils/formatDate';

const statusOptions: Array<{ label: string; value: RiskCaseStatus }> = [
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'En revision', value: 'EN_REVISION' },
  { label: 'Resuelto', value: 'RESUELTO' },
];

const resultOptions: Array<{ label: string; value: RiskCaseReviewResult }> = [
  { label: 'Requiere antecedentes', value: 'REQUIERE_ANTECEDENTES' },
  { label: 'Sospecha descartada', value: 'SOSPECHA_DESCARTADA' },
  { label: 'Operacion sospechosa', value: 'OPERACION_SOSPECHOSA' },
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
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCaseContext() {
      if (!Number.isFinite(transactionId) || transactionId <= 0) {
        setError('No se indico una transaccion valida para gestionar.');
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
          throw new Error('Transaccion no encontrada.');
        }

        const currentCase =
          await riskCaseService.findByTransaction(transactionId);
        const availableUsers = await userService.findAll();

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
          setResponsibleName(currentCase?.responsibleName ?? '');
          setResponsibleUserId(
            currentCase?.responsibleUserId
              ? String(currentCase.responsibleUserId)
              : '0',
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
  }, [transactionId]);

  const rules = useMemo(
    () => transaction?.riskResult?.ruleDetails?.rules ?? [],
    [transaction],
  );
  const evaluatedRules = useMemo(
    () => transaction?.riskResult?.ruleDetails?.evaluatedRules ?? [],
    [transaction],
  );
  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === responsibleUserId),
    [responsibleUserId, users],
  );
  const currentRiskLevel = transaction?.riskResult?.riskLevel?.name ?? '';
  const recommendedAction =
    transaction?.riskResult?.ruleDetails?.recommendedAction ??
    getRecommendedAction(currentRiskLevel);
  const formCompleteness = [
    Boolean(status),
    Boolean(priority),
    Boolean(reviewResult),
    responsibleUserId !== '',
    status === 'PENDIENTE' || Boolean(observations.trim()),
    status === 'PENDIENTE' || Boolean(actionTaken.trim()),
    status !== 'RESUELTO' || Boolean(reviewResult),
  ].filter(Boolean).length;
  const formProgress = Math.round((formCompleteness / 7) * 100);
  const disabledStatusValues = getDisabledStatusValues(riskCase?.status);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!transaction) {
      setError('No existe una transaccion cargada para gestionar.');
      return;
    }

    if (
      (status === 'EN_REVISION' || status === 'RESUELTO') &&
      responsibleUserId === '0' &&
      !responsibleName.trim()
    ) {
      setError('Asigna un responsable antes de avanzar el caso.');
      return;
    }

    if (status === 'RESUELTO' && reviewResult === 'REQUIERE_ANTECEDENTES') {
      setError(
        'Si requiere antecedentes, manten el caso Pendiente o En revision.',
      );
      return;
    }

    if (status === 'RESUELTO' && (!observations.trim() || !actionTaken.trim())) {
      setError(
        'Para resolver el caso registra fundamento y accion realizada.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        transactionId: transaction.id,
        status,
        priority,
        reviewResult,
        observations: observations.trim(),
        actionTaken: actionTaken.trim(),
        internalComments: internalComments.trim(),
        responsibleName: responsibleName.trim() || undefined,
        responsibleUserId: Number(responsibleUserId),
      };
      const savedCase = riskCase
        ? await riskCaseService.update(riskCase.id, payload)
        : await riskCaseService.create(payload);

      setRiskCase(savedCase);
      setSuccessMessage('Caso guardado correctamente.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Gestion de caso
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Revision analitica de transaccion clasificada por FraudShield.
          </h1>
        </section>

        {isLoading ? (
          <LoadingState />
        ) : error && !transaction ? (
          <Message tone="error">{error}</Message>
        ) : transaction ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
            <section className="space-y-5">
              <div className="app-card overflow-hidden rounded-[24px] p-0">
                <div className="border-b border-slate-200 bg-slate-950 p-5 text-white lg:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                        Caso operacional
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        Transaccion #{transaction.id}
                      </h2>
                    </div>
                    <RiskPill level={currentRiskLevel} />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label="Score"
                      value={transaction.riskResult?.score ?? 'N/D'}
                    />
                    <MiniMetric label="Accion" value={recommendedAction} />
                    <MiniMetric
                      label="Caso"
                      value={riskCase ? `#${riskCase.id}` : 'Nuevo'}
                    />
                  </div>
                </div>

                <div className="p-5 lg:p-6">
                  <h3 className="text-lg font-bold text-slate-950">
                    Antecedentes de la transaccion
                  </h3>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailItem label="ID transaccion" value={`#${transaction.id}`} />
                <DetailItem label="Codigo" value={transaction.transactionCode} />
                <DetailItem label="Monto" value={formatCurrencyCLP(transaction.amount)} />
                <DetailItem
                  label="Fecha"
                  value={`${formatDate(transaction.transactionDate)} ${transaction.transactionHour}`}
                />
                <DetailItem
                  label="Score"
                  value={transaction.riskResult?.score}
                />
                <DetailItem
                  label="Nivel"
                  value={transaction.riskResult?.riskLevel?.name}
                />
              </dl>
                </div>
              </div>

              <section className="app-card rounded-[24px] p-5 lg:p-6">
                <h3 className="text-sm font-bold text-slate-950">
                  Motivo de clasificacion
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {transaction.riskResult?.ruleDetails?.finalReason ??
                    transaction.riskResult?.observation ??
                    'No disponible'}
                </p>
              </section>

              <section className="app-card rounded-[24px] p-5 lg:p-6">
                <h3 className="text-sm font-bold text-slate-950">
                  Reglas R1-R5
                </h3>
                {evaluatedRules.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {evaluatedRules.map((rule) => (
                      <article
                        key={rule.code}
                        className={[
                          'rounded-2xl border p-4',
                          rule.activated
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-slate-200 bg-slate-50',
                        ].join(' ')}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-bold text-slate-950">
                            {rule.code} · {rule.name}
                          </p>
                          <span
                            className={[
                              'rounded-full px-3 py-1 text-xs font-bold',
                              rule.activated
                                ? 'bg-blue-700 text-white'
                                : 'bg-white text-slate-500 ring-1 ring-slate-200',
                            ].join(' ')}
                          >
                            {rule.activated ? 'Activada' : 'No activada'} ·{' '}
                            {rule.scoreImpact} pts
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {rule.description}
                        </p>
                        <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                          <RuleDetail label="Condicion" value={rule.condition} />
                          <RuleDetail
                            label="Valor observado"
                            value={rule.observedValue}
                          />
                          <RuleDetail label="Umbral" value={rule.threshold} />
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : rules.length > 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {rules.map((rule) => (
                      <p key={rule.code}>
                        <strong>{rule.code}</strong> - {rule.description} (
                        score {rule.scoreImpact})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    {transaction.riskResult?.observation ?? 'No disponible'}
                  </p>
                )}
              </section>
            </section>

            <form
              onSubmit={handleSubmit}
              className="app-card rounded-[24px] p-5 lg:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Mesa del analista
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Registro dinamico del caso
                  </h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Avance
                  </p>
                  <p className="text-xl font-bold text-slate-950">
                    {formProgress}%
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-700 transition-all"
                  style={{ width: `${formProgress}%` }}
                />
              </div>

              {riskCase ? (
                <p className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Editando caso #{riskCase.id}, actualizado el{' '}
                  {formatDate(riskCase.updatedAt)}.
                </p>
              ) : null}

              <div className="mt-6 space-y-4">
                <DynamicSection
                  icon={<FiClock className="h-4 w-4" aria-hidden="true" />}
                  title="Estado de investigacion"
                >
                  <SegmentedChoices
                    value={status}
                    options={statusOptions}
                    toneMap={statusTone}
                    disabledValues={disabledStatusValues}
                    onChange={(value) => setStatus(value as RiskCaseStatus)}
                  />
                  {disabledStatusValues.includes('RESUELTO') ? (
                    <InlineNotice tone="info">
                      El cierre solo se habilita despues de iniciar la revision
                      y asignar un responsable.
                    </InlineNotice>
                  ) : null}
                </DynamicSection>

                <DynamicSection
                  icon={<FiFlag className="h-4 w-4" aria-hidden="true" />}
                  title="Prioridad operacional"
                >
                  <SegmentedChoices
                    value={priority}
                    options={priorityOptions}
                    toneMap={priorityTone}
                    onChange={(value) => setPriority(value as RiskCasePriority)}
                  />
                </DynamicSection>

                <DynamicSection
                  icon={<FiUserCheck className="h-4 w-4" aria-hidden="true" />}
                  title="Asignacion"
                >
                <SelectField
                  label="Responsable asignado"
                  value={responsibleUserId}
                  options={[
                    { label: 'Sin asignar', value: '0' },
                    ...users.map((user) => ({
                      label: `${user.name} (${user.email})`,
                      value: String(user.id),
                    })),
                  ]}
                  onChange={setResponsibleUserId}
                />
                  <TextField
                    label="Nombre visible del responsable"
                    value={responsibleName}
                    onChange={setResponsibleName}
                    placeholder={
                      selectedUser
                        ? selectedUser.name
                        : 'Ej: Analista de riesgo'
                    }
                  />
                </DynamicSection>

                <DynamicSection
                  icon={<FiFileText className="h-4 w-4" aria-hidden="true" />}
                  title="Revision del analista"
                >
                  <TextArea
                    label="Observaciones del analista"
                    value={observations}
                    onChange={setObservations}
                    placeholder="Describe los antecedentes revisados y el criterio aplicado."
                  />
                  <TextArea
                    label="Accion realizada"
                    value={actionTaken}
                    onChange={setActionTaken}
                    placeholder="Ej: se solicita antecedente adicional, se valida con supervisor, se cierra revision."
                  />
                </DynamicSection>

                {(status === 'EN_REVISION' || status === 'RESUELTO') ? (
                  <DynamicSection
                    icon={
                      status === 'RESUELTO' ? (
                        <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <FiShield className="h-4 w-4" aria-hidden="true" />
                      )
                    }
                    title={
                      status === 'RESUELTO'
                        ? 'Decision de cierre'
                        : 'Resultado preliminar'
                    }
                  >
                    <SegmentedChoices
                      value={reviewResult}
                      options={resultOptions}
                      onChange={(value) =>
                        setReviewResult(value as RiskCaseReviewResult)
                      }
                    />
                    {reviewResult === 'OPERACION_SOSPECHOSA' ? (
                      <InlineNotice tone="warning">
                        Registrar como operación sospechosa no confirma fraude;
                        deja trazabilidad para seguimiento reforzado.
                      </InlineNotice>
                    ) : null}
                  </DynamicSection>
                ) : null}

                {priority === 'URGENTE' || status === 'RESUELTO' ? (
                  <DynamicSection
                    icon={
                      <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
                    }
                    title="Comentarios internos"
                  >
                    <TextArea
                      label="Notas internas"
                      value={internalComments}
                      onChange={setInternalComments}
                      placeholder="Notas operacionales visibles para auditoria interna del caso."
                    />
                  </DynamicSection>
                ) : null}
              </div>

              {riskCase?.timelineEvents?.length ? (
                <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-950">
                    Timeline del caso
                  </h3>
                  <ol className="mt-3 space-y-3">
                    {riskCase.timelineEvents.map((event) => (
                      <li
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
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {error ? <Message tone="error">{error}</Message> : null}
              {successMessage ? (
                <Message tone="success">{successMessage}</Message>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Guardando...' : 'Guardar caso'}
                </button>
                <Link
                  to="/case-history"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Ver historial
                </Link>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
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
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value ?? 'No disponible'}
      </dd>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-100">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
        {value ?? 'No disponible'}
      </p>
    </div>
  );
}

function RiskPill({ level }: { level: string }) {
  const normalized = level.toUpperCase();
  const classes =
    normalized === 'ALTO'
      ? 'bg-red-100 text-red-800'
      : normalized === 'MEDIO'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';

  return (
    <span className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${classes}`}>
      Riesgo {level || 'No disponible'}
    </span>
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
    <div>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">
        {value && value.trim() ? value : 'No disponible'}
      </dd>
    </div>
  );
}

function DynamicSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
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
    <div className="grid gap-2 sm:grid-cols-3">
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
              'min-h-12 rounded-2xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
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

function InlineNotice({
  tone,
  children,
}: {
  tone: 'warning' | 'info';
  children: ReactNode;
}) {
  const classes =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-blue-200 bg-blue-50 text-blue-800';

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${classes}`}>
      {children}
    </p>
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
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
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

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      'No fue posible completar la operacion solicitada.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No fue posible completar la operacion solicitada.';
}

function getRecommendedAction(riskLevel: string) {
  const normalized = riskLevel.toUpperCase();

  if (normalized === 'BAJO') {
    return 'Registrar y monitorear.';
  }

  if (normalized === 'MEDIO') {
    return 'Requiere revision del analista.';
  }

  if (normalized === 'ALTO') {
    return 'Revision prioritaria.';
  }

  return 'No disponible';
}

function getDisabledStatusValues(currentStatus?: RiskCaseStatus) {
  if (!currentStatus) {
    return ['RESUELTO'];
  }

  if (currentStatus === 'PENDIENTE') {
    return ['RESUELTO'];
  }

  if (currentStatus === 'EN_REVISION') {
    return ['PENDIENTE'];
  }

  return ['PENDIENTE', 'EN_REVISION'];
}

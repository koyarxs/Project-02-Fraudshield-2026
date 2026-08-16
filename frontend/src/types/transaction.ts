export interface ApiRiskLevel {
  id: number;
  name: string;
  description?: string | null;
  priority?: number;
}

export interface ApiRiskResult {
  id: number;
  score: number;
  observation?: string | null;
  ruleDetails?: RiskExplanation | null;
  classifiedAt: string;
  transactionId: number;
  riskLevelId: number;
  riskLevel?: ApiRiskLevel | null;
}

export interface RiskRuleDetail {
  code: string;
  name: string;
  description: string;
  scoreImpact: number;
  reason: string;
  condition?: string | null;
  observedValue?: string | null;
  threshold?: string | null;
  activated?: boolean;
}

export interface RiskExplanation {
  algorithm?: string;
  finalReason?: string;
  recommendedAction?: string;
  rules?: RiskRuleDetail[];
  evaluatedRules?: RiskRuleDetail[];
}

export interface ApiValidationError {
  id?: number;
  field?: string | null;
  message?: string | null;
  transactionId?: number;
}

export interface ApiProcessingBatch {
  id: number;
  totalRecords?: number;
  processedRecords?: number;
  status?: string;
  startedAt?: string;
  finishedAt?: string | null;
  uploadedFileId?: number;
}

export interface ApiTransaction {
  id: number;
  transactionCode: string;
  customerCode: string;
  amount: string | number;
  currency?: string | null;
  transactionDate: string;
  transactionHour: string;
  originLocation?: string | null;
  destinationLocation?: string | null;
  createdAt?: string;
  batchId: number;
  batch?: ApiProcessingBatch | null;
  riskResult?: ApiRiskResult | null;
  riskCases?: ApiRiskCase[];
  validationErrors?: ApiValidationError[];
}

export interface ApiRiskCase {
  id: number;
  status: RiskCaseStatus;
  priority: RiskCasePriority;
  reviewResult?: RiskCaseReviewResult | null;
  observations?: string | null;
  actionTaken?: string | null;
  internalComments?: string | null;
  responsibleName?: string | null;
  riskLevelSnapshot: string;
  scoreSnapshot: number;
  classificationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  transactionId: number;
  riskResultId?: number | null;
  responsibleUserId?: number | null;
  transaction?: ApiTransaction | null;
  riskResult?: ApiRiskResult | null;
  responsibleUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
  timelineEvents?: ApiRiskCaseTimeline[];
}

export interface ApiRiskCaseTimeline {
  id: number;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  riskCaseId: number;
  userId?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export type RiskCaseStatus = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO';

export type RiskCaseReviewResult =
  | 'REQUIERE_ANTECEDENTES'
  | 'SOSPECHA_DESCARTADA'
  | 'OPERACION_SOSPECHOSA';

export type RiskCasePriority = 'NORMAL' | 'ALTA' | 'URGENTE';

export interface UpsertRiskCasePayload {
  transactionId: number;
  status?: RiskCaseStatus;
  priority?: RiskCasePriority;
  reviewResult?: RiskCaseReviewResult;
  observations?: string;
  actionTaken?: string;
  internalComments?: string;
  responsibleName?: string;
  responsibleUserId?: number;
}

export interface RiskCaseSummary {
  pending: number;
  inReview: number;
  resolved: number;
  highRiskPending: number;
  open?: number;
  priorityOpen?: number;
  suspicious?: number;
  discarded?: number;
}

import type { ApiTransaction } from './transaction';

export type HistorySource = 'api' | 'session';
export type HistoryRisk = 'Alto' | 'Medio' | 'Bajo';

export interface ApiHistoryUser {
  id: number;
  name?: string;
  email?: string;
}

export interface ApiHistoryUploadedFile {
  id: number;
  fileName: string;
  fileType?: string;
  fileSize: number;
  status?: string;
  uploadedAt: string;
  userId?: number;
  user?: ApiHistoryUser | null;
}

export interface ApiHistoryEvent {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  batchId: number;
}

export interface ApiHistoryMetric {
  id?: number;
  totalRecords: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  generatedAt?: string;
  batchId?: number;
}

export interface ApiHistoryBatch {
  id: number;
  totalRecords?: number;
  processedRecords?: number;
  status?: string;
  startedAt?: string;
  finishedAt?: string | null;
  uploadedFileId?: number;
  uploadedFile?: ApiHistoryUploadedFile | null;
  transactions?: ApiTransaction[];
  histories?: ApiHistoryEvent[];
  dashboardMetric?: ApiHistoryMetric | null;
}

export interface HistoryRecord {
  source: HistorySource;
  batchId: number;
  uploadedFileId?: number;
  fileName: string;
  fileSize?: number;
  uploadedAt?: string;
  status?: string;
  totalRecords?: number;
  processedRecords?: number;
  highRiskCount?: number;
  mediumRiskCount?: number;
  lowRiskCount?: number;
  dominantRisk?: HistoryRisk;
  responsibleUser?: string;
  validationMessages: string[];
  histories: ApiHistoryEvent[];
  persistedEvidence: string;
}

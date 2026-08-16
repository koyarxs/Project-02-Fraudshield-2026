export type ProcessingStatus = 'Completado';
export type RiskLevel = 'Alto' | 'Medio' | 'Bajo';

export interface DashboardMetric {
  id?: number;
  totalRecords: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  batchId?: number;
  createdAt?: string;
}

export interface FileProcessingResponse {
  message: string;
  uploadedFileId: number;
  batchId: number;
  totalRecords: number;
  dashboardMetric: DashboardMetric;
}

export interface ProcessingBatch {
  message: string;
  uploadedFileId: number;
  batchId: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: ProcessingStatus;
  totalRecords: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
}

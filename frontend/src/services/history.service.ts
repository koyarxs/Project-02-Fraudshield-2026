import api from './api';
import {
  getDominantRisk,
  processingStoreService,
} from './processing-store.service';
import type {
  ApiHistoryBatch,
  HistoryRecord,
  HistoryRisk,
} from '../types/history';
import type { ProcessingBatch } from '../types/processing';

function toNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function calculateDominantRisk(record: {
  highRiskCount?: number;
  mediumRiskCount?: number;
  lowRiskCount?: number;
}): HistoryRisk | undefined {
  const risks: Array<{ level: HistoryRisk; value: number }> = [
    { level: 'Alto', value: record.highRiskCount ?? 0 },
    { level: 'Medio', value: record.mediumRiskCount ?? 0 },
    { level: 'Bajo', value: record.lowRiskCount ?? 0 },
  ];

  const highest = risks.sort((first, second) => second.value - first.value)[0];

  return highest.value > 0 ? highest.level : undefined;
}

function normalizeApiBatch(batch: ApiHistoryBatch): HistoryRecord {
  const metric = batch.dashboardMetric;
  const uploadedFile = batch.uploadedFile;
  const histories = batch.histories ?? [];
  const highRiskCount = toNumber(metric?.highRiskCount);
  const mediumRiskCount = toNumber(metric?.mediumRiskCount);
  const lowRiskCount = toNumber(metric?.lowRiskCount);
  const totalRecords =
    toNumber(metric?.totalRecords) ??
    toNumber(batch.totalRecords) ??
    (batch.transactions?.length ? batch.transactions.length : undefined);
  const responsibleUser =
    uploadedFile?.user?.name ?? uploadedFile?.user?.email ?? undefined;
  const validationMessages = histories
    .map((history) => history.description ?? history.action)
    .filter(Boolean);

  return {
    source: 'api',
    batchId: batch.id,
    uploadedFileId: batch.uploadedFileId ?? uploadedFile?.id,
    fileName: uploadedFile?.fileName ?? `Batch #${batch.id}`,
    fileSize: uploadedFile?.fileSize,
    uploadedAt: uploadedFile?.uploadedAt ?? batch.finishedAt ?? batch.startedAt,
    status: batch.status ?? uploadedFile?.status,
    totalRecords,
    processedRecords: toNumber(batch.processedRecords),
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    dominantRisk: calculateDominantRisk({
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    }),
    responsibleUser,
    validationMessages,
    histories,
    persistedEvidence: `Batch #${batch.id} recuperado desde GET /processing-batch`,
  };
}

function normalizeSessionBatch(batch: ProcessingBatch): HistoryRecord {
  return {
    source: 'session',
    batchId: batch.batchId,
    uploadedFileId: batch.uploadedFileId,
    fileName: batch.fileName,
    fileSize: batch.fileSize,
    uploadedAt: batch.uploadedAt,
    status: batch.status,
    totalRecords: batch.totalRecords,
    processedRecords: batch.totalRecords,
    highRiskCount: batch.highRiskCount,
    mediumRiskCount: batch.mediumRiskCount,
    lowRiskCount: batch.lowRiskCount,
    dominantRisk: getDominantRisk(batch),
    validationMessages: batch.message ? [batch.message] : [],
    histories: [],
    persistedEvidence: 'Disponible en la sesión actual',
  };
}

class HistoryService {
  async findAll() {
    const response = await api.get<ApiHistoryBatch[]>('/processing-batch');
    const apiRecords = response.data.map(normalizeApiBatch);
    const apiBatchIds = new Set(apiRecords.map((record) => record.batchId));
    const sessionOnlyRecords = processingStoreService
      .getAll()
      .filter((batch) => !apiBatchIds.has(batch.batchId))
      .map(normalizeSessionBatch);

    return [...apiRecords, ...sessionOnlyRecords].sort(
      (first, second) =>
        new Date(second.uploadedAt ?? 0).getTime() -
        new Date(first.uploadedAt ?? 0).getTime(),
    );
  }

  getSessionHistory() {
    return processingStoreService.getAll().map(normalizeSessionBatch);
  }
}

export const historyService = new HistoryService();

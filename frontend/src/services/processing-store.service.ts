import type {
  FileProcessingResponse,
  ProcessingBatch,
  RiskLevel,
} from '../types/processing';

const STORAGE_KEY = 'fraudshield_processing_batches';
const UPDATE_EVENT = 'fraudshield:processing-updated';

function readBatches(): ProcessingBatch[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeBatches(batches: ProcessingBatch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

class ProcessingStoreService {
  subscribe(listener: () => void) {
    window.addEventListener(UPDATE_EVENT, listener);
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener(UPDATE_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  }

  getAll(): ProcessingBatch[] {
    return readBatches().sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() -
        new Date(a.uploadedAt).getTime(),
    );
  }

  getByBatchId(batchId: number): ProcessingBatch | null {
    return this.getAll().find((batch) => batch.batchId === batchId) ?? null;
  }

  saveFromUpload(
    response: FileProcessingResponse,
    file: File,
  ): ProcessingBatch {
    const metric = response.dashboardMetric;
    const batch: ProcessingBatch = {
      message: response.message,
      uploadedFileId: response.uploadedFileId,
      batchId: response.batchId,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: metric.createdAt ?? new Date().toISOString(),
      status: 'Completado',
      totalRecords: response.totalRecords,
      lowRiskCount: metric.lowRiskCount,
      mediumRiskCount: metric.mediumRiskCount,
      highRiskCount: metric.highRiskCount,
    };

    const withoutDuplicate = readBatches().filter(
      (item) => item.batchId !== batch.batchId,
    );

    writeBatches([batch, ...withoutDuplicate]);

    return batch;
  }

  getTotals() {
    return this.getAll().reduce(
      (totals, batch) => ({
        totalRecords: totals.totalRecords + batch.totalRecords,
        lowRiskCount: totals.lowRiskCount + batch.lowRiskCount,
        mediumRiskCount: totals.mediumRiskCount + batch.mediumRiskCount,
        highRiskCount: totals.highRiskCount + batch.highRiskCount,
        batchCount: totals.batchCount + 1,
      }),
      {
        totalRecords: 0,
        lowRiskCount: 0,
        mediumRiskCount: 0,
        highRiskCount: 0,
        batchCount: 0,
      },
    );
  }
}

export function getDominantRisk(batch: ProcessingBatch): RiskLevel {
  const risks: Array<{ level: RiskLevel; value: number }> = [
    { level: 'Alto', value: batch.highRiskCount },
    { level: 'Medio', value: batch.mediumRiskCount },
    { level: 'Bajo', value: batch.lowRiskCount },
  ];

  return risks.sort((a, b) => b.value - a.value)[0].level;
}

export const processingStoreService = new ProcessingStoreService();

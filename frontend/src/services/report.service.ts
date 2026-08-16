import api from './api';
import type { ApiAuditLog } from './audit-log.service';
import type { ApiHistoryBatch } from '../types/history';
import type { ApiRiskCase, ApiTransaction } from '../types/transaction';

export interface ReportDataset {
  batches: ApiHistoryBatch[];
  transactions: ApiTransaction[];
  cases: ApiRiskCase[];
  auditLogs: ApiAuditLog[];
}

class ReportService {
  async getDataset(): Promise<ReportDataset> {
    const [batches, transactions, cases, auditLogs] = await Promise.all([
      api.get<ApiHistoryBatch[]>('/processing-batch'),
      api.get<ApiTransaction[]>('/transaction'),
      api.get<ApiRiskCase[]>('/risk-case'),
      api.get<ApiAuditLog[]>('/audit-log'),
    ]);

    return {
      batches: batches.data,
      transactions: transactions.data,
      cases: cases.data,
      auditLogs: auditLogs.data,
    };
  }
}

export default new ReportService();

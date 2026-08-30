import api from './api';
import type {
  ApiRiskCase,
  RiskCaseSummary,
  UpsertRiskCasePayload,
} from '../types/transaction';

class RiskCaseService {
  async findAll(): Promise<ApiRiskCase[]> {
    const response = await api.get<ApiRiskCase[]>('/risk-case');

    return response.data;
  }

  async findSummary(): Promise<RiskCaseSummary> {
    const response = await api.get<RiskCaseSummary>('/risk-case/summary');

    return response.data;
  }

  async findByTransaction(
    transactionId: number,
  ): Promise<ApiRiskCase | null> {
    const response = await api.get<ApiRiskCase | null>(
      `/risk-case/transaction/${transactionId}`,
    );

    return response.data;
  }

  async create(payload: UpsertRiskCasePayload): Promise<ApiRiskCase> {
    const response = await api.post<ApiRiskCase>('/risk-case', payload);

    return response.data;
  }

  async update(
    id: number,
    payload: Partial<UpsertRiskCasePayload>,
  ): Promise<ApiRiskCase> {
    const response = await api.patch<ApiRiskCase>(`/risk-case/${id}`, payload);

    return response.data;
  }

}

export default new RiskCaseService();

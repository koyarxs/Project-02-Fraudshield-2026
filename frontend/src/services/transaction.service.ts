import api from './api';
import type { ApiTransaction } from '../types/transaction';

class TransactionService {
  async findAll(): Promise<ApiTransaction[]> {
    const response = await api.get<ApiTransaction[]>('/transaction');

    return response.data;
  }

  async findByBatchId(batchId: number): Promise<ApiTransaction[]> {
    const response = await api.get<ApiTransaction[]>(
      `/transaction/batch/${batchId}`,
    );

    return response.data;
  }
}

export default new TransactionService();

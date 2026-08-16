import api from './api';

export interface ApiAuditLog {
  id: number;
  action: string;
  module: string;
  detail?: string | null;
  createdAt: string;
  userId?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

class AuditLogService {
  async findAll(): Promise<ApiAuditLog[]> {
    const response = await api.get<ApiAuditLog[]>('/audit-log');

    return response.data;
  }
}

export default new AuditLogService();

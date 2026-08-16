import api from './api';

export interface ApiControlListEntry {
  id: number;
  listType: 'WATCHLIST' | 'ALLOWLIST';
  identifierType: 'CUSTOMER' | 'TRANSACTION' | 'LOCATION';
  identifier: string;
  reason?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export type ControlListPayload = Pick<
  ApiControlListEntry,
  'listType' | 'identifierType' | 'identifier' | 'active'
> & {
  reason?: string;
};

class ControlListService {
  async findAll(): Promise<ApiControlListEntry[]> {
    const response = await api.get<ApiControlListEntry[]>('/control-list');

    return response.data;
  }

  async create(payload: ControlListPayload): Promise<ApiControlListEntry> {
    const response = await api.post<ApiControlListEntry>(
      '/control-list',
      payload,
    );

    return response.data;
  }

  async update(
    id: number,
    payload: Partial<ControlListPayload>,
  ): Promise<ApiControlListEntry> {
    const response = await api.patch<ApiControlListEntry>(
      `/control-list/${id}`,
      payload,
    );

    return response.data;
  }

  async remove(id: number): Promise<ApiControlListEntry> {
    const response = await api.delete<ApiControlListEntry>(
      `/control-list/${id}`,
    );

    return response.data;
  }
}

export default new ControlListService();

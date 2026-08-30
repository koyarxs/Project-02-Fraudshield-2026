import api from './api';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMINISTRADOR' | 'ANALISTA';
  active: boolean;
}

class UserService {
  async findAll(): Promise<ApiUser[]> {
    const response = await api.get<ApiUser[]>('/user');

    return response.data;
  }

  async findAssignable(): Promise<ApiUser[]> {
    const response = await api.get<ApiUser[]>('/user/assignable');

    return response.data;
  }
}

export default new UserService();

import api from './api';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
}

class UserService {
  async findAll(): Promise<ApiUser[]> {
    const response = await api.get<ApiUser[]>('/user');

    return response.data;
  }
}

export default new UserService();

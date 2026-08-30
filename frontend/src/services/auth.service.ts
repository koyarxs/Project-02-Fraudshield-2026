import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export type UserRole = 'ADMINISTRADOR' | 'ANALISTA';

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
  };
}

class AuthService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data);

    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }

  getToken(): string | null {
    return typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;
  }

  getUser(): LoginResponse['user'] | null {
    const user =
      typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    try {
      const parsed = user
        ? (JSON.parse(user) as Partial<LoginResponse['user']>)
        : null;

      if (
        !parsed ||
        (parsed.role !== 'ADMINISTRADOR' && parsed.role !== 'ANALISTA') ||
        parsed.active !== true
      ) {
        this.logout();
        return null;
      }

      return parsed as LoginResponse['user'];
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService();

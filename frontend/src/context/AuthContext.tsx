import {
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import authService, {
  type LoginRequest,
  type LoginResponse,
} from '../services/auth.service';
import { AuthContext, type AuthContextType } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_CHANGE_EVENT = 'fraudshield-auth-change';
let cachedUserRaw: string | null | undefined;
let cachedUser: LoginResponse['user'] | null = null;

function subscribeAuth(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  };
}

function emitAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

function getAuthSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem('user');

  if (rawUser === cachedUserRaw) {
    return cachedUser;
  }

  cachedUserRaw = rawUser;
  cachedUser = authService.getUser();

  return cachedUser;
}

function getServerAuthSnapshot() {
  return null;
}

function subscribeClientReady() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerClientSnapshot() {
  return false;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const user = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const isClientReady = useSyncExternalStore(
    subscribeClientReady,
    getClientSnapshot,
    getServerClientSnapshot,
  );

  const login = async (credentials: LoginRequest) => {
    await authService.login(credentials);
    emitAuthChange();
  };

  const logout = () => {
    authService.logout();
    emitAuthChange();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading: !isClientReady,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

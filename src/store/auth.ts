import { create } from 'zustand';
import { Storage } from '../utils/storage';
import { authApi } from '../api';
import { initApiClient } from '../api/client';
import { queryClient } from '../lib/queryClient';

interface AuthState {
  token: string | null;
  role: string;
  accountId: string;
  username: string;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token:           null,
  role:            '',
  accountId:       '',
  username:        '',
  isAuthenticated: false,
  isLoading:       true,

  initialize: async () => {
    await initApiClient();
    const token = await Storage.getToken();
    if (token) {
      const { role, accountId, username } = await Storage.getUserInfo();
      set({ token, role, accountId, username, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    const resp = await authApi.login({ username, password });
    await Storage.setToken(resp.token);
    await Storage.setUserInfo(resp.role, resp.accountId, username);
    set({
      token:           resp.token,
      role:            resp.role,
      accountId:       resp.accountId ?? '',
      username,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await Storage.clear();
    queryClient.clear();
    set({ token: null, role: '', accountId: '', username: '', isAuthenticated: false });
  },
}));

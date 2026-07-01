import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Storage } from '../utils/storage';

// Base URL is loaded from storage so the user can configure it in Settings
let _baseURL = 'http://192.168.0.109:9091';

export async function initApiClient() {
  _baseURL = await Storage.getBaseUrl();
  apiClient.defaults.baseURL = _baseURL;
}

export const apiClient = axios.create({
  baseURL: _baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await Storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Refresh base URL in case it was changed in Settings
  config.baseURL = await Storage.getBaseUrl();
  return config;
});

// Unwrap ApiResponse<T> envelope â†’ return .data field directly
apiClient.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      if (!res.data.success) {
        return Promise.reject(new ApiError(res.data.errorCode ?? 'API_ERROR', res.data.message ?? 'Request failed'));
      }
      return { ...res, data: res.data.data };
    }
    return res;
  },
  (err: AxiosError<{ errorCode?: string; message?: string }>) => {
    const code    = err.response?.data?.errorCode ?? 'NETWORK_ERROR';
    const message = err.response?.data?.message ?? err.message ?? 'Network error';
    return Promise.reject(new ApiError(code, message, err.response?.status));
  },
);

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}


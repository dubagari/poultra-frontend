import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_URL, readStoredTokens, writeStoredTokens } from "./tokens";

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

let refreshPromise: Promise<string | null> | null = null;

const redirectToLogin = (): void => {
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/register") {
    window.location.href = "/login";
  }
};

const performRefresh = async (): Promise<string | null> => {
  const { refreshToken } = readStoredTokens();
  if (!refreshToken) return null;

  const response = await axios.post<{ success: boolean; data?: AuthResponse }>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  const payload = response.data;
  const data = payload.data;

  if (!payload.success || !data?.accessToken || !data?.refreshToken) {
    writeStoredTokens({ accessToken: null, refreshToken: null });
    return null;
  }

  writeStoredTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data.accessToken;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = readStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const status = error.response?.status;
    const isAuthCall =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/register") ||
      original?.url?.includes("/auth/refresh");

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;

      refreshPromise =
        refreshPromise ??
        performRefresh().finally(() => {
          refreshPromise = null;
        });

      const newToken = await refreshPromise;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export { api };

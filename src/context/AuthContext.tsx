import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthResponse } from "../lib/api";
import { readStoredTokens, writeStoredTokens } from "../lib/tokens";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: string;
  isPlatformAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredAuthUser {
  user: AuthUser;
}

const USER_KEY = "poultra.user";

const readStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StoredAuthUser;
      return stored.user ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const writeStoredUser = (user: AuthUser | null): void => {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify({ user }));
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const { accessToken, refreshToken } = readStoredTokens();
    return accessToken || refreshToken ? readStoredUser() : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { accessToken, refreshToken } = readStoredTokens();

    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        // Validates the access token; on 401 the axios
        // layer refreshes or redirects to /login.
        await api.get("/businesses");
      } catch {
        if (!cancelled) {
          const { accessToken } = readStoredTokens();
          if (!accessToken) {
            setUser(null);
            writeStoredUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuth = useCallback((data: AuthResponse): AuthUser => {
    writeStoredTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    writeStoredUser(data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await api.post<{
        success: boolean;
        message?: string;
        data?: AuthResponse;
      }>("/auth/login", input);

      const data = response.data.data;

      if (!response.data.success || !data) {
        throw new Error(response.data.message ?? "Login failed");
      }

      return applyAuth(data);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      phone?: string;
    }) => {
      const response = await api.post<{
        success: boolean;
        message?: string;
      }>("/auth/register", input);

      if (!response.data.success) {
        throw new Error(
          response.data.message ?? "Registration failed"
        );
      }

      // Register returns only the user; tokens come from login.
      return login({ email: input.email, password: input.password });
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore network/auth errors on logout */
    }
    writeStoredTokens({ accessToken: null, refreshToken: null });
    writeStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

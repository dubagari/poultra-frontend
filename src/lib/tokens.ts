export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:5000/api/v1";

export const API_URL = API_BASE_URL;

type Tokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const TOKENS_KEY = "poultra.tokens";
const ACTIVE_BUSINESS_KEY = "poultra.activeBusinessId";

export function readStoredTokens(): Tokens {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as Tokens;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function writeStoredTokens(tokens: Tokens): void {
  if (!tokens.accessToken && !tokens.refreshToken) {
    localStorage.removeItem(TOKENS_KEY);
    return;
  }
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function readActiveBusinessId(): string | null {
  return localStorage.getItem(ACTIVE_BUSINESS_KEY);
}

export function writeActiveBusinessId(id: string | null): void {
  if (!id) {
    localStorage.removeItem(ACTIVE_BUSINESS_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { readActiveBusinessId, writeActiveBusinessId } from "../lib/tokens";
import { useAuth } from "./AuthContext";

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  status: string;
  email?: string;
  phone?: string;
  logo?: string;
  description?: string;
}

interface BusinessContextValue {
  businesses: Business[];
  activeBusiness: Business | null;
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string) => void;
  isLoading: boolean;
}

const BusinessContext =
  createContext<BusinessContextValue | undefined>(undefined);

interface BusinessResponse {
  success: boolean;
  data?: Record<string, unknown>[];
}

// API documents use _id; the frontend normalizes to id.
const normalizeBusiness = (raw: Record<string, unknown>): Business => ({
  id: (raw.id as string) ?? (raw._id as string),
  ownerId: (raw.ownerId as string) ?? (raw.owner as string),
  name: raw.name as string,
  slug: raw.slug as string,
  status: raw.status as string,
  email: raw.email as string | undefined,
  phone: raw.phone as string | undefined,
  logo: raw.logo as string | undefined,
  description: raw.description as string | undefined,
});

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readActiveBusinessId()
  );

  const query = useQuery({
    queryKey: ["my-businesses", user?.id],
    queryFn: async () => {
      const response = await api.get<BusinessResponse>("/businesses");
      const rawList = response.data.data ?? [];
      return rawList.map(normalizeBusiness);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const businesses = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data]
  );

  const activeBusiness = useMemo(
    () =>
      businesses.find((business) => business.id === selectedId) ??
      businesses[0] ??
      null,
    [businesses, selectedId]
  );

  useEffect(() => {
    if (activeBusiness) {
      writeActiveBusinessId(activeBusiness.id);
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (businesses.length === 0) {
      setSelectedId(null);
    }
  }, [businesses.length]);

  const setActiveBusinessId = useCallback((id: string) => {
    writeActiveBusinessId(id);
    setSelectedId(id);
  }, []);

  const value = useMemo<BusinessContextValue>(
    () => ({
      businesses,
      activeBusiness,
      activeBusinessId: activeBusiness?.id ?? null,
      setActiveBusinessId,
      isLoading: authLoading || query.isLoading,
    }),
    [
      businesses,
      activeBusiness,
      setActiveBusinessId,
      authLoading,
      query.isLoading,
    ]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinesses(): BusinessContextValue {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error("useBusinesses must be used inside BusinessProvider");
  }

  return context;
}

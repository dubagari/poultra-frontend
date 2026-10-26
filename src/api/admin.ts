import { api } from "@/lib/api";

export interface AdminOverview {
  businesses: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
  };
  subscriptions: {
    active: number;
    trialing: number;
    expired: number;
    cancelled: number;
  };
  revenue: {
    thisMonth: number;
    allTime: number;
    currency: string;
  };
}

export interface AdminBusinessRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    planCode: string;
    interval: string;
    status: string;
    effectiveStatus: string;
    trialEndsAt?: string;
    periodEnd?: string;
  } | null;
  createdAt: string;
}

export interface AdminPaginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AdminPaymentRow {
  id: string;
  business: {
    id: string;
    name: string;
  };
  planCode: string;
  interval: string;
  amount: number;
  status: string;
  reference?: string;
  createdAt: string;
}

export interface AdminRevenuePoint {
  month: string;
  total: number;
}

export interface AdminPlanRow {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: {
    locations: number;
    houses: number;
    flocks: number;
    users: number;
    products: number;
  };
  features: string[];
  isActive: boolean;
}

export const getAdminOverview = async (): Promise<AdminOverview> => {
  const response = await api.get<{
    success: boolean;
    data?: AdminOverview;
  }>("/admin/overview");

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to load platform overview");
  }

  return response.data.data;
};

export const listAdminBusinesses = async (input: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminPaginated<AdminBusinessRow>> => {
  const response = await api.get<{
    success: boolean;
    data?: AdminPaginated<AdminBusinessRow>;
  }>("/admin/businesses", {
    params: {
      ...(input.search ? { search: input.search } : {}),
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to load businesses");
  }

  return response.data.data;
};

export const setBusinessStatus = async (
  businessId: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<void> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
  }>(`/admin/businesses/${businessId}/status`, { status });

  if (!response.data.success) {
    throw new Error(response.data.message ?? "Failed to update status");
  }
};

export const listAdminPayments = async (input: {
  page?: number;
  limit?: number;
}): Promise<AdminPaginated<AdminPaymentRow>> => {
  const response = await api.get<{
    success: boolean;
    data?: AdminPaginated<AdminPaymentRow>;
  }>("/admin/payments", {
    params: {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to load payments");
  }

  return response.data.data;
};

export const getAdminRevenue = async (
  months: number
): Promise<AdminRevenuePoint[]> => {
  const response = await api.get<{
    success: boolean;
    data?: { months: number; points: AdminRevenuePoint[] };
  }>("/admin/revenue", { params: { months } });

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to load revenue");
  }

  return response.data.data.points;
};

export const listAdminPlans = async (): Promise<AdminPlanRow[]> => {
  const response = await api.get<{
    success: boolean;
    data?: AdminPlanRow[];
  }>("/admin/plans");

  if (!response.data.success || !response.data.data) {
    throw new Error("Failed to load plans");
  }

  return response.data.data;
};

export const updateAdminPlan = async (
  code: string,
  input: Partial<AdminPlanRow>
): Promise<AdminPlanRow> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: AdminPlanRow;
  }>(`/admin/plans/${code}`, input);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message ?? "Failed to update plan");
  }

  return response.data.data;
};

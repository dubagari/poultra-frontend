import { api } from "@/lib/api";

export interface Plan {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  planCode: string;
  billingInterval: "MONTHLY" | "YEARLY";
  status:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELLED"
    | "EXPIRED";
  trialEndsAt?: string;
  periodStart?: string;
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionView {
  subscription: Subscription | null;
  effectiveStatus: string;
}

export interface CheckoutResult {
  payment: {
    id: string;
    reference: string;
    amount: number;
    planCode?: string;
  };
  authorizationUrl: string;
}

export const listPlans = async (
  businessId: string
): Promise<Plan[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Plan[];
  }>("/subscriptions/plans", {
    params: { businessId },
  });

  return response.data.data ?? [];
};

export const getSubscription = async (
  businessId: string
): Promise<SubscriptionView> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>;
  }>(`/subscriptions/business/${businessId}`, {
    params: { businessId },
  });

  const raw = response.data.data ?? {};

  return {
    subscription: (raw.subscription as Subscription) ?? null,
    effectiveStatus: (raw.effectiveStatus as string) ?? "FREE",
  };
};

export const cancelSubscription = async (
  businessId: string
): Promise<void> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
  }>("/subscriptions/cancel", { businessId });

  if (!response.data.success) {
    throw new Error(
      response.data.message ?? "Failed to cancel subscription"
    );
  }
};

export const initCheckout = async (
  businessId: string,
  input: {
    interval: "MONTHLY" | "YEARLY";
    planCode?: string;
    email?: string;
  }
): Promise<CheckoutResult> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/payments/init", {
    businessId,
    ...input,
  });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to start checkout");
  }

  const authorizationUrl =
    (data.authorizationUrl as string) ??
    ((data as { checkout?: { authorizationUrl?: string } }).checkout
      ?.authorizationUrl ??
      "");

  const payment = (data.payment as CheckoutResult["payment"]) ?? {
    id: "",
    reference: "",
    amount: 0,
  };

  if (!authorizationUrl) {
    throw new Error("Checkout did not return an authorization URL");
  }

  return { payment, authorizationUrl };
};

export const verifyPayment = async (
  reference: string
): Promise<void> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
  }>("/payments/verify", { reference });

  if (!response.data.success) {
    throw new Error(
      response.data.message ?? "Payment verification failed"
    );
  }
};

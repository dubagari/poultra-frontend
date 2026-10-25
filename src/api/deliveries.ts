import { api } from "@/lib/api";

export interface Delivery {
  id: string;
  orderId: string;
  address?: string;
  recipientName?: string;
  recipientPhone?: string;
  driverName?: string;
  deliveryFee: number;
  status: "SCHEDULED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  scheduledAt?: string;
  deliveredAt?: string;
  notes?: string;
}

const normalizeDelivery = (raw: Record<string, unknown>): Delivery => ({
  id: (raw.id as string) ?? (raw._id as string),
  orderId: raw.orderId as string,
  address: raw.address as string | undefined,
  recipientName: raw.recipientName as string | undefined,
  recipientPhone: raw.recipientPhone as string | undefined,
  driverName: raw.driverName as string | undefined,
  deliveryFee: (raw.deliveryFee as number) ?? 0,
  status: raw.status as Delivery["status"],
  scheduledAt: raw.scheduledAt as string | undefined,
  deliveredAt: raw.deliveredAt as string | undefined,
  notes: raw.notes as string | undefined,
});

export const listDeliveries = async (
  businessId: string
): Promise<Delivery[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/deliveries", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeDelivery);
};

export const createDelivery = async (
  input: {
    businessId: string;
    orderId: string;
    address?: string;
    recipientName?: string;
    recipientPhone?: string;
    driverName?: string;
    deliveryFee?: number;
    scheduledAt?: string;
    notes?: string;
  }
): Promise<Delivery> => {
  const { businessId, orderId, ...rest } = input;

  const payload: Record<string, unknown> = {
    businessId,
    orderId,
    deliveryFee: rest.deliveryFee ?? 0,
  };

  (["address", "recipientName", "recipientPhone", "driverName", "scheduledAt", "notes"] as const).forEach(
    (key) => {
      const value = rest[key];
      if (value !== undefined && value !== "") {
        payload[key] = value;
      }
    }
  );

  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/deliveries", payload);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to schedule delivery");
  }

  return normalizeDelivery(data);
};

export const startDelivery = async (
  businessId: string,
  deliveryId: string
): Promise<Delivery> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/deliveries/${deliveryId}/start`, { businessId });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to start delivery");
  }

  return normalizeDelivery(data);
};

export const completeDelivery = async (
  businessId: string,
  deliveryId: string
): Promise<Delivery> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/deliveries/${deliveryId}/complete`, { businessId });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to complete delivery");
  }

  return normalizeDelivery(data);
};

export const cancelDelivery = async (
  businessId: string,
  deliveryId: string,
  reason?: string
): Promise<Delivery> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/deliveries/${deliveryId}/cancel`, {
    businessId,
    ...(reason ? { reason } : {}),
  });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to cancel delivery");
  }

  return normalizeDelivery(data);
};

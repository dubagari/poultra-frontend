import { api } from "@/lib/api";

export interface OrderItem {
  inventoryId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  cartId: string;
  items: OrderItem[];
  totalAmount: number;
  status: "CONFIRMED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID";
  notes?: string;
  createdAt?: string;
}

const normalizeOrder = (raw: Record<string, unknown>): Order => ({
  id: (raw.id as string) ?? (raw._id as string),
  orderNumber: raw.orderNumber as string,
  customerId: raw.customerId as string,
  cartId: raw.cartId as string,
  items: (raw.items as Record<string, unknown>[] | undefined)?.map(
    (item) => ({
      inventoryId: item.inventoryId as string,
      productId: item.productId as string,
      quantity: (item.quantity as number) ?? 0,
      unitPrice: (item.unitPrice as number) ?? 0,
      lineTotal: (item.lineTotal as number) ?? 0,
    })
  ) ?? [],
  totalAmount: (raw.totalAmount as number) ?? 0,
  status: raw.status as Order["status"],
  paymentStatus: raw.paymentStatus as Order["paymentStatus"],
  notes: raw.notes as string | undefined,
  createdAt: raw.createdAt as string | undefined,
});

export const listOrders = async (businessId: string): Promise<Order[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/orders", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeOrder);
};

export const createOrder = async (
  cartId: string,
  notes?: string
): Promise<Order> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/orders", { cartId, ...(notes ? { notes } : {}) });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create order");
  }

  return normalizeOrder(data);
};

export const payOrder = async (
  businessId: string,
  orderId: string
): Promise<Order> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/orders/${orderId}/pay`, { businessId });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to mark order as paid");
  }

  return normalizeOrder(data);
};

export const cancelOrder = async (
  businessId: string,
  orderId: string,
  reason?: string
): Promise<Order> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/orders/${orderId}/cancel`, {
    businessId,
    ...(reason ? { reason } : {}),
  });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to cancel order");
  }

  return normalizeOrder(data);
};

import { api } from "@/lib/api";

export interface CartItem {
  inventoryId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  businessId: string;
  customerId: string;
  items: CartItem[];
  totalAmount: number;
  status: "ACTIVE" | "CONVERTED" | "CANCELLED";
}

const normalizeCart = (raw: Record<string, unknown>): Cart => ({
  id: (raw.id as string) ?? (raw._id as string),
  businessId: raw.businessId as string,
  customerId: raw.customerId as string,
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
  status: (raw.status as Cart["status"]) ?? "ACTIVE",
});

export const listCarts = async (businessId: string): Promise<Cart[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/carts", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeCart);
};

export const createCart = async (
  businessId: string,
  customerId: string
): Promise<Cart> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/carts", { businessId, customerId });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create cart");
  }

  return normalizeCart(data);
};

export const addCartItem = async (
  cartId: string,
  input: {
    inventoryId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
  }
): Promise<Cart> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/carts/${cartId}/items`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to add item");
  }

  return normalizeCart(data);
};

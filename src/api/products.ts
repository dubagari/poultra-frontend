import { api } from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  code: string;
  type:
    | "FEED"
    | "EGG"
    | "LIVE_BIRD"
    | "PROCESSED_BIRD"
    | "MEDICATION"
    | "OTHER";
  unit: "KG" | "BAG" | "PIECE" | "TRAY";
  description?: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface ProductInput {
  name: string;
  code: string;
  type: Product["type"];
  unit: Product["unit"];
  description?: string;
  status?: Product["status"];
}

export const normalizeProduct = (
  raw: Record<string, unknown>
): Product => ({
  id: (raw.id as string) ?? (raw._id as string),
  name: raw.name as string,
  code: raw.code as string,
  type: raw.type as Product["type"],
  unit: raw.unit as Product["unit"],
  description: raw.description as string | undefined,
  status: (raw.status as Product["status"]) ?? "ACTIVE",
});

export const listProducts = async (
  businessId: string
): Promise<Product[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/products", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeProduct);
};

export const createProduct = async (
  businessId: string,
  input: ProductInput
): Promise<Product> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/products", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create product");
  }

  return normalizeProduct(data);
};

export const updateProduct = async (
  productId: string,
  input: Partial<ProductInput>
): Promise<Product> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/products/${productId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to update product");
  }

  return normalizeProduct(data);
};

import { api } from "@/lib/api";

export interface StockEntry {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  unit: "KG" | "BAG" | "PIECE" | "TRAY";
  status: "ACTIVE" | "INACTIVE";
}

export interface StockEntryInput {
  locationId: string;
  productId: string;
  quantity: number;
  lowStockThreshold?: number;
  reservedQuantity?: number;
  unit: StockEntry["unit"];
}

export const normalizeStockEntry = (
  raw: Record<string, unknown>
): StockEntry => ({
  id: (raw.id as string) ?? (raw._id as string),
  productId: raw.productId as string,
  locationId: raw.locationId as string,
  quantity: (raw.quantity as number) ?? 0,
  reservedQuantity: (raw.reservedQuantity as number) ?? 0,
  availableQuantity: (raw.availableQuantity as number) ?? 0,
  lowStockThreshold: (raw.lowStockThreshold as number) ?? 10,
  unit: raw.unit as StockEntry["unit"],
  status: (raw.status as StockEntry["status"]) ?? "ACTIVE",
});

export const listStock = async (
  businessId: string
): Promise<StockEntry[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/inventory", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeStockEntry);
};

export const createStockEntry = async (
  businessId: string,
  input: StockEntryInput
): Promise<StockEntry> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/inventory", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to create stock entry"
    );
  }

  return normalizeStockEntry(data);
};

export const updateStockEntry = async (
  inventoryId: string,
  input: {
    status?: StockEntry["status"];
    lowStockThreshold?: number;
  }
): Promise<StockEntry> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/inventory/${inventoryId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to update stock entry"
    );
  }

  return normalizeStockEntry(data);
};

export const getLowStock = async (
  businessId: string
): Promise<StockEntry[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/inventory/alerts/low-stock", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeStockEntry);
};

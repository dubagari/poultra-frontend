import { api } from "@/lib/api";

export interface InventoryItem {
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

const normalizeInventoryItem = (
  raw: Record<string, unknown>
): InventoryItem => ({
  id: (raw.id as string) ?? (raw._id as string),
  productId: raw.productId as string,
  locationId: raw.locationId as string,
  quantity: (raw.quantity as number) ?? 0,
  reservedQuantity: (raw.reservedQuantity as number) ?? 0,
  availableQuantity: (raw.availableQuantity as number) ?? 0,
  lowStockThreshold: (raw.lowStockThreshold as number) ?? 10,
  unit: raw.unit as InventoryItem["unit"],
  status: (raw.status as InventoryItem["status"]) ?? "ACTIVE",
});

export const listInventory = async (
  businessId: string
): Promise<InventoryItem[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/inventory", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeInventoryItem);
};

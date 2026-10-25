import { api } from "@/lib/api";

export interface TransferItem {
  productId: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  toLocationId: string;
  items: (TransferItem & { fromInventoryId?: string; newQuantity?: number })[];
  notes?: string;
  createdBy?: string;
}

export interface CreateTransferInput {
  fromLocationId: string;
  toLocationId: string;
  items: TransferItem[];
  notes?: string;
}

const normalizeTransfer = (
  raw: Record<string, unknown>
): StockTransfer => ({
  id: (raw.id as string) ?? (raw._id as string),
  transferNumber: raw.transferNumber as string,
  fromLocationId: raw.fromLocationId as string,
  toLocationId: raw.toLocationId as string,
  items:
    (
      raw.items as
        | Record<string, unknown>[]
        | undefined
    )?.map((item) => ({
      productId: item.productId as string,
      quantity: (item.quantity as number) ?? 0,
      fromInventoryId: item.fromInventoryId as string | undefined,
      newQuantity: item.newQuantity as number | undefined,
    })) ?? [],
  notes: raw.notes as string | undefined,
  createdBy: raw.createdBy as string | undefined,
});

export const listTransfers = async (
  businessId: string
): Promise<StockTransfer[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/stock-transfers", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeTransfer);
};

export const createTransfer = async (
  businessId: string,
  input: CreateTransferInput
): Promise<StockTransfer> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/stock-transfers", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to create stock transfer"
    );
  }

  return normalizeTransfer(data);
};

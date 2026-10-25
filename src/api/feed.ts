import { api } from "@/lib/api";

export interface FeedProduct {
  id: string;
  productId: string;
  feedType:
    | "STARTER"
    | "GROWER"
    | "FINISHER"
    | "LAYER"
    | "BREEDER"
    | "OTHER";
}

const normalizeFeedProduct = (
  raw: Record<string, unknown>
): FeedProduct => ({
  id: (raw.id as string) ?? (raw._id as string),
  productId: raw.productId as string,
  feedType: raw.feedType as FeedProduct["feedType"],
});

export const listFeedProducts = async (
  businessId: string
): Promise<FeedProduct[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/feed-products", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeFeedProduct);
};

export const createFeedProduct = async (
  businessId: string,
  input: { productId: string; feedType: FeedProduct["feedType"] }
): Promise<FeedProduct> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/feed-products", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to create feed product"
    );
  }

  return normalizeFeedProduct(data);
};

export interface FeedConsumption {
  id: string;
  flockId: string;
  feedProductId: string;
  locationId: string;
  quantity: number;
  unit: "KG" | "BAG";
  consumptionDate: string;
  status: "RECORDED" | "CANCELLED";
  notes?: string;
}

const normalizeFeedConsumption = (
  raw: Record<string, unknown>
): FeedConsumption => ({
  id: (raw.id as string) ?? (raw._id as string),
  flockId: raw.flockId as string,
  feedProductId: raw.feedProductId as string,
  locationId: raw.locationId as string,
  quantity: (raw.quantity as number) ?? 0,
  unit: (raw.unit as FeedConsumption["unit"]) ?? "KG",
  consumptionDate: (raw.consumptionDate as string) ?? "",
  status: (raw.status as FeedConsumption["status"]) ?? "RECORDED",
  notes: raw.notes as string | undefined,
});

export const listFeedConsumptionHistory = async (
  businessId: string,
  filters?: {
    flockId?: string;
    feedProductId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<FeedConsumption[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/feed-consumption/history", {
    params: { businessId, ...filters },
  });

  return (response.data.data ?? []).map(normalizeFeedConsumption);
};

export const createFeedConsumption = async (
  businessId: string,
  input: {
    flockId: string;
    feedProductId: string;
    locationId: string;
    quantity: number;
    unit: FeedConsumption["unit"];
    consumptionDate: string;
    notes?: string;
  }
): Promise<FeedConsumption> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/feed-consumption", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to record feed consumption"
    );
  }

  return normalizeFeedConsumption(data);
};

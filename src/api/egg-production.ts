import { api } from "@/lib/api";

export interface EggProduction {
  id: string;
  flockId: string;
  locationId: string;
  productionDate: string;
  goodEggs: number;
  brokenEggs: number;
  unit: "PIECE" | "TRAY";
  status: "RECORDED" | "CANCELLED";
  notes?: string;
}

export interface EggProductionInput {
  flockId: string;
  locationId: string;
  productionDate: string;
  goodEggs: number;
  brokenEggs: number;
  unit: EggProduction["unit"];
  notes?: string;
}

const normalizeEggProduction = (
  raw: Record<string, unknown>
): EggProduction => ({
  id: (raw.id as string) ?? (raw._id as string),
  flockId: raw.flockId as string,
  locationId: raw.locationId as string,
  productionDate: (raw.productionDate as string) ?? "",
  goodEggs: (raw.goodEggs as number) ?? 0,
  brokenEggs: (raw.brokenEggs as number) ?? 0,
  unit: (raw.unit as EggProduction["unit"]) ?? "PIECE",
  status: (raw.status as EggProduction["status"]) ?? "RECORDED",
  notes: raw.notes as string | undefined,
});

export const listEggProductions = async (
  businessId: string
): Promise<EggProduction[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>(`/egg-production/business/${businessId}`);

  return (response.data.data ?? []).map(normalizeEggProduction);
};

export const createEggProduction = async (
  businessId: string,
  input: EggProductionInput
): Promise<EggProduction> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/egg-production", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to record egg production"
    );
  }

  return normalizeEggProduction(data);
};

export const cancelEggProduction = async (
  eggProductionId: string
): Promise<EggProduction> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/egg-production/${eggProductionId}`, {
    status: "CANCELLED",
  });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to cancel egg production record"
    );
  }

  return normalizeEggProduction(data);
};

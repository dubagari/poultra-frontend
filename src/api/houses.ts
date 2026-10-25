import { api } from "@/lib/api";

export interface House {
  id: string;
  locationId: string;
  name: string;
  code: string;
  type: "BROODER" | "LAYER" | "BROILER" | "BREEDER" | "GENERAL";
  capacity?: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface HouseInput {
  locationId: string;
  name: string;
  code: string;
  type: House["type"];
  capacity?: number;
  status?: House["status"];
}

export const normalizeHouse = (
  raw: Record<string, unknown>
): House => ({
  id: (raw.id as string) ?? (raw._id as string),
  locationId: raw.locationId as string,
  name: raw.name as string,
  code: raw.code as string,
  type: raw.type as House["type"],
  capacity: raw.capacity as number | undefined,
  status: (raw.status as House["status"]) ?? "ACTIVE",
});

export const listHouses = async (businessId: string): Promise<House[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/houses", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeHouse);
};

export const createHouse = async (
  businessId: string,
  input: HouseInput
): Promise<House> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/houses", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create house");
  }

  return normalizeHouse(data);
};

export const updateHouse = async (
  houseId: string,
  input: Partial<HouseInput>
): Promise<House> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/houses/${houseId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to update house");
  }

  return normalizeHouse(data);
};

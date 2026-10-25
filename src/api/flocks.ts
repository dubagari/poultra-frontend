import { api } from "@/lib/api";

export interface Flock {
  id: string;
  locationId: string;
  houseId: string;
  name: string;
  flockNumber: string;
  type: "BROILER" | "LAYER" | "BREEDER" | "PULLET" | "OTHER";
  breed?: string;
  arrivalDate: string;
  initialQuantity: number;
  status: "ACTIVE" | "SOLD" | "CLOSED";
  notes?: string;
}

export interface FlockInput {
  locationId: string;
  houseId: string;
  name: string;
  flockNumber: string;
  type: Flock["type"];
  breed?: string;
  arrivalDate: string;
  initialQuantity: number;
  notes?: string;
}

export const normalizeFlock = (raw: Record<string, unknown>): Flock => ({
  id: (raw.id as string) ?? (raw._id as string),
  locationId: raw.locationId as string,
  houseId: raw.houseId as string,
  name: raw.name as string,
  flockNumber: raw.flockNumber as string,
  type: raw.type as Flock["type"],
  breed: raw.breed as string | undefined,
  arrivalDate: (raw.arrivalDate as string) ?? "",
  initialQuantity: (raw.initialQuantity as number) ?? 0,
  status: (raw.status as Flock["status"]) ?? "ACTIVE",
  notes: raw.notes as string | undefined,
});

export const listFlocks = async (businessId: string): Promise<Flock[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/flocks", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeFlock);
};

export const createFlock = async (
  businessId: string,
  input: FlockInput
): Promise<Flock> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/flocks", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create flock");
  }

  return normalizeFlock(data);
};

export const updateFlock = async (
  flockId: string,
  input: Partial<FlockInput> & { status?: Flock["status"] }
): Promise<Flock> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/flocks/${flockId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to update flock");
  }

  return normalizeFlock(data);
};

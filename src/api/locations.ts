import { api } from "@/lib/api";

export interface Location {
  id: string;
  name: string;
  code: string;
  type:
    | "FARM"
    | "FEED_STORE"
    | "PROCESSING_CENTER"
    | "WAREHOUSE"
    | "OFFICE"
    | "SHOP";
  address?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface LocationInput {
  name: string;
  code: string;
  type: Location["type"];
  address?: string;
  phone?: string;
  status?: Location["status"];
}

export const normalizeLocation = (
  raw: Record<string, unknown>
): Location => ({
  id: (raw.id as string) ?? (raw._id as string),
  name: raw.name as string,
  code: raw.code as string,
  type: raw.type as Location["type"],
  address: raw.address as string | undefined,
  phone: raw.phone as string | undefined,
  status: (raw.status as Location["status"]) ?? "ACTIVE",
});

export const listLocations = async (
  businessId: string
): Promise<Location[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/locations", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeLocation);
};

export const createLocation = async (
  businessId: string,
  input: LocationInput
): Promise<Location> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/locations", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create location");
  }

  return normalizeLocation(data);
};

export const updateLocation = async (
  locationId: string,
  input: Partial<LocationInput>
): Promise<Location> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/locations/${locationId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to update location");
  }

  return normalizeLocation(data);
};

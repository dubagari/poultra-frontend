import { api } from "@/lib/api";

export interface Medication {
  id: string;
  flockId: string;
  productId: string;
  locationId: string;
  healthRecordId?: string;
  administeredAt: string;
  dosage: string;
  quantity: number;
  route:
    | "ORAL"
    | "WATER"
    | "INJECTION"
    | "TOPICAL"
    | "OTHER";
  reason?: string;
  notes?: string;
  status: "ACTIVE" | "CANCELLED";
}

export interface MedicationInput {
  flockId: string;
  productId: string;
  locationId: string;
  administeredAt: string;
  dosage: string;
  quantity: number;
  route: Medication["route"];
  reason?: string;
  notes?: string;
}

const normalizeMedication = (
  raw: Record<string, unknown>
): Medication => ({
  id: (raw.id as string) ?? (raw._id as string),
  flockId: raw.flockId as string,
  productId: raw.productId as string,
  locationId: raw.locationId as string,
  healthRecordId: raw.healthRecordId as string | undefined,
  administeredAt: (raw.administeredAt as string) ?? "",
  dosage: raw.dosage as string,
  quantity: (raw.quantity as number) ?? 0,
  route: raw.route as Medication["route"],
  reason: raw.reason as string | undefined,
  notes: raw.notes as string | undefined,
  status: (raw.status as Medication["status"]) ?? "ACTIVE",
});

export const listMedications = async (
  businessId: string
): Promise<Medication[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>(`/medications/business/${businessId}`);

  return (response.data.data ?? []).map(normalizeMedication);
};

export const createMedication = async (
  businessId: string,
  input: MedicationInput
): Promise<Medication> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/medications", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to record medication"
    );
  }

  return normalizeMedication(data);
};

export const cancelMedication = async (
  businessId: string,
  medicationId: string
): Promise<Medication> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/medications/business/${businessId}/${medicationId}/cancel`, {});

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to cancel medication record"
    );
  }

  return normalizeMedication(data);
};

import { api } from "@/lib/api";

export interface HealthRecord {
  id: string;
  flockId: string;
  eventDate: string;
  eventType:
    | "OBSERVATION"
    | "ILLNESS"
    | "TREATMENT"
    | "VACCINATION"
    | "RECOVERY"
    | "MORTALITY";
  status: "NORMAL" | "MONITORING" | "TREATED" | "RECOVERED" | "CRITICAL";
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

export interface HealthRecordInput {
  flockId: string;
  eventDate: string;
  eventType: HealthRecord["eventType"];
  status: HealthRecord["status"];
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

const normalizeHealthRecord = (
  raw: Record<string, unknown>
): HealthRecord => ({
  id: (raw.id as string) ?? (raw._id as string),
  flockId: raw.flockId as string,
  eventDate: (raw.eventDate as string) ?? "",
  eventType: raw.eventType as HealthRecord["eventType"],
  status: (raw.status as HealthRecord["status"]) ?? "NORMAL",
  symptoms: raw.symptoms as string | undefined,
  diagnosis: raw.diagnosis as string | undefined,
  treatment: raw.treatment as string | undefined,
  notes: raw.notes as string | undefined,
});

export const listHealthRecords = async (
  businessId: string
): Promise<HealthRecord[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>(`/farm-health/business/${businessId}`);

  return (response.data.data ?? []).map(normalizeHealthRecord);
};

export const createHealthRecord = async (
  businessId: string,
  input: HealthRecordInput
): Promise<HealthRecord> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/farm-health", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to record health record"
    );
  }

  return normalizeHealthRecord(data);
};

export const updateHealthRecord = async (
  healthRecordId: string,
  input: Partial<HealthRecordInput>
): Promise<HealthRecord> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/farm-health/${healthRecordId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(
      response.data.message ?? "Failed to update health record"
    );
  }

  return normalizeHealthRecord(data);
};

export const listHealthRecordsByFlock = async (
  businessId: string,
  flockId: string
): Promise<HealthRecord[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>(`/farm-health/business/${businessId}/flock/${flockId}`);

  return (response.data.data ?? []).map(normalizeHealthRecord);
};

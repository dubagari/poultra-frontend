import { api } from "@/lib/api";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: "WALK_IN" | "REGULAR" | "DISTRIBUTOR";
  notes?: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: Customer["type"];
  notes?: string;
}

const normalizeCustomer = (raw: Record<string, unknown>): Customer => ({
  id: (raw.id as string) ?? (raw._id as string),
  name: raw.name as string,
  phone: raw.phone as string,
  email: raw.email as string | undefined,
  address: raw.address as string | undefined,
  type: (raw.type as Customer["type"]) ?? "WALK_IN",
  notes: raw.notes as string | undefined,
});

export const listCustomers = async (
  businessId: string
): Promise<Customer[]> => {
  const response = await api.get<{
    success: boolean;
    data?: Record<string, unknown>[];
  }>("/customers", { params: { businessId } });

  return (response.data.data ?? []).map(normalizeCustomer);
};

export const createCustomer = async (
  businessId: string,
  input: CustomerInput
): Promise<Customer> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/customers", { businessId, ...input });

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to create customer");
  }

  return normalizeCustomer(data);
};

export const updateCustomer = async (
  customerId: string,
  input: Partial<CustomerInput>
): Promise<Customer> => {
  const response = await api.patch<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/customers/${customerId}`, input);

  const data = response.data.data;

  if (!response.data.success || !data) {
    throw new Error(response.data.message ?? "Failed to update customer");
  }

  return normalizeCustomer(data);
};

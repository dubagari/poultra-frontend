import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserRound, Pencil } from "lucide-react";
import { listCustomers, createCustomer, updateCustomer, type Customer } from "@/api/customers";
import { useBusinesses } from "@/context/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<Customer["type"], string> = {
  WALK_IN: "Walk-in",
  REGULAR: "Regular",
  DISTRIBUTOR: "Distributor",
};

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  type: Customer["type"];
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  type: "WALK_IN",
  notes: "",
};

export function CustomersPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);

  const customersQuery = useQuery({
    queryKey: ["customers", businessId],
    queryFn: () => listCustomers(businessId as string),
    enabled: Boolean(businessId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        type: form.type,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      };

      if (editing) {
        return updateCustomer(editing.id, input);
      }
      return createCustomer(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer created");
      void queryClient.invalidateQueries({
        queryKey: ["customers", businessId],
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? "",
      type: customer.type,
      notes: customer.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || form.phone.trim().length < 7) {
      toast.error("Name and a valid phone number are required");
      return;
    }

    saveMutation.mutate();
  };

  const customers = customersQuery.data ?? [];
  const filtered = customers.filter((customer) => {
    if (!search.trim()) return true;

    const needle = search.trim().toLowerCase();
    return (
      customer.name.toLowerCase().includes(needle) ||
      customer.phone.includes(needle) ||
      (customer.email?.toLowerCase().includes(needle) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            People and businesses that buy from {activeBusiness?.name}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All customers</CardTitle>
          <CardDescription>
            {customersQuery.isLoading
              ? "Loading customers..."
              : `${filtered.length} of ${customers.length} shown`}
          </CardDescription>
          <Input
            placeholder="Search by name, phone or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c", "d"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserRound className="size-4" />
                      {search ? "No customers match your search" : "No customers yet. Add your first one!"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.type === "REGULAR"
                            ? "default"
                            : customer.type === "DISTRIBUTOR"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {TYPE_LABELS[customer.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                        <Pencil /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit customer" : "Add customer"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this customer's details."
                : "Add someone who buys from you regularly."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      type: value as CustomerFormState["type"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WALK_IN">Walk-in</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email (optional)</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Address (optional)</Label>
              <Input
                id="customer-address"
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-notes">Notes (optional)</Label>
              <Input
                id="customer-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

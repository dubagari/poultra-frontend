import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pill, XCircle } from "lucide-react";
import {
  listMedications,
  createMedication,
  cancelMedication,
  type Medication,
} from "@/api/medications";
import { listFlocks, type Flock } from "@/api/flocks";
import { listProducts, type Product } from "@/api/products";
import { listLocations } from "@/api/locations";
import { useBusinesses } from "@/context/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

const ROUTE_LABELS: Record<Medication["route"], string> = {
  ORAL: "Oral",
  WATER: "In water",
  INJECTION: "Injection",
  TOPICAL: "Topical",
  OTHER: "Other",
};

interface FormState {
  flockId: string;
  productId: string;
  locationId: string;
  administeredAt: string;
  dosage: string;
  quantity: string;
  route: Medication["route"];
  reason: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  flockId: "",
  productId: "",
  locationId: "",
  administeredAt: new Date().toISOString().slice(0, 10),
  dosage: "",
  quantity: "1",
  route: "WATER",
  reason: "",
  notes: "",
};

export function MedicationsPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const medicationsQuery = useQuery({
    queryKey: ["medications", businessId],
    queryFn: () => listMedications(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocksQuery = useQuery({
    queryKey: ["flocks", businessId],
    queryFn: () => listFlocks(businessId as string),
    enabled: Boolean(businessId),
  });

  const productsQuery = useQuery({
    queryKey: ["products", businessId],
    queryFn: () => listProducts(businessId as string),
    enabled: Boolean(businessId),
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", businessId],
    queryFn: () => listLocations(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocks: Flock[] = flocksQuery.data ?? [];
  const products: Product[] = (productsQuery.data ?? []).filter(
    (product) => product.status === "ACTIVE"
  );
  const locations = locationsQuery.data ?? [];

  const flockById = new Map(flocks.map((f) => [f.id, f]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.flockId || !form.productId || !form.locationId) {
        throw new Error("Choose a flock, medication product and location");
      }
      if (!form.dosage.trim()) {
        throw new Error("Dosage is required");
      }

      return createMedication(businessId as string, {
        flockId: form.flockId,
        productId: form.productId,
        locationId: form.locationId,
        administeredAt: new Date(form.administeredAt).toISOString(),
        dosage: form.dosage.trim(),
        quantity: Number(form.quantity) || 0,
        route: form.route,
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Medication recorded, stock deducted");
      void queryClient.invalidateQueries({
        queryKey: ["medications", businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", businessId],
      });
      setDialogOpen(false);
      setForm({
        ...EMPTY_FORM,
        flockId: form.flockId,
        locationId: form.locationId,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (medicationId: string) =>
      cancelMedication(businessId as string, medicationId),
    onSuccess: () => {
      toast.success("Medication record cancelled");
      void queryClient.invalidateQueries({
        queryKey: ["medications", businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", businessId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel"
      );
    },
  });

  const medications = medicationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Medications
          </h1>
          <p className="text-sm text-muted-foreground">
            Doses administered to flocks and how they hit stock
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Record dose
        </Button>
      </div>

      {(flocks.length === 0 ||
        products.length === 0 ||
        locations.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Medication needs an active flock, a MEDICATION-type product and a
              location with stock. Create those first.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All doses</CardTitle>
          <CardDescription>
            {medicationsQuery.isLoading
              ? "Loading medications..."
              : `${medications.length} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicationsQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Pill className="size-4" />
                      No doses recorded yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                medications.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.administeredAt).toLocaleDateString(
                        "en-NG"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flockById.get(record.flockId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {productById.get(record.productId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.dosage}
                      {record.reason ? ` — ${record.reason}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.quantity.toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ROUTE_LABELS[record.route]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "ACTIVE"
                            ? "default"
                            : "outline"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(record.id)}
                        >
                          <XCircle /> Cancel
                        </Button>
                      )}
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
            <DialogTitle>Record medication</DialogTitle>
            <DialogDescription>
              Quantity is deducted from stock at the chosen location.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Flock</Label>
              <Select
                value={form.flockId}
                onValueChange={(value) =>
                  setForm({ ...form, flockId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks
                    .filter((flock) => flock.status === "ACTIVE")
                    .map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name} ({flock.flockNumber})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Medication product</Label>
                <Select
                  value={form.productId}
                  onValueChange={(value) =>
                    setForm({ ...form, productId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((product) => product.type === "MEDICATION")
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock location</Label>
                <Select
                  value={form.locationId}
                  onValueChange={(value) =>
                    setForm({ ...form, locationId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="med-date">Administered at</Label>
                <Input
                  id="med-date"
                  type="date"
                  value={form.administeredAt}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      administeredAt: event.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-quantity">Quantity used</Label>
                <Input
                  id="med-quantity"
                  type="number"
                  min={0}
                  step="any"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({ ...form, quantity: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="med-dosage">Dosage</Label>
                <Input
                  id="med-dosage"
                  value={form.dosage}
                  onChange={(event) =>
                    setForm({ ...form, dosage: event.target.value })
                  }
                  placeholder="e.g. 5ml per litre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Select
                  value={form.route}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      route: value as FormState["route"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORAL">Oral</SelectItem>
                    <SelectItem value="WATER">In water</SelectItem>
                    <SelectItem value="INJECTION">Injection</SelectItem>
                    <SelectItem value="TOPICAL">Topical</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-reason">Reason</Label>
              <Input
                id="med-reason"
                value={form.reason}
                onChange={(event) =>
                  setForm({ ...form, reason: event.target.value })
                }
                placeholder="e.g. deworming"
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Record dose"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

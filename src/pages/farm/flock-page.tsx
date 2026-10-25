import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Bird, Pencil } from "lucide-react";
import { listFlocks, createFlock, updateFlock, type Flock } from "@/api/flocks";
import { listLocations } from "@/api/locations";
import { listHouses } from "@/api/houses";
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

const TYPE_LABELS: Record<Flock["type"], string> = {
  BROILER: "Broiler",
  LAYER: "Layer",
  BREEDER: "Breeder",
  PULLET: "Pullet",
  OTHER: "Other",
};

interface FormState {
  locationId: string;
  houseId: string;
  name: string;
  flockNumber: string;
  type: Flock["type"];
  breed: string;
  arrivalDate: string;
  initialQuantity: string;
  status: Flock["status"];
  notes: string;
}

const EMPTY_FORM: FormState = {
  locationId: "",
  houseId: "",
  name: "",
  flockNumber: "",
  type: "LAYER",
  breed: "",
  arrivalDate: "",
  initialQuantity: "0",
  status: "ACTIVE",
  notes: "",
};

export function FlockPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flock | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const flocksQuery = useQuery({
    queryKey: ["flocks", businessId],
    queryFn: () => listFlocks(businessId as string),
    enabled: Boolean(businessId),
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", businessId],
    queryFn: () => listLocations(businessId as string),
    enabled: Boolean(businessId),
  });

  const housesQuery = useQuery({
    queryKey: ["houses", businessId],
    queryFn: () => listHouses(businessId as string),
    enabled: Boolean(businessId),
  });

  const locations = locationsQuery.data ?? [];
  const houses = housesQuery.data ?? [];

  const housesByLocation = new Map<string, string[]>();
  houses.forEach((house) => {
    const list = housesByLocation.get(house.locationId) ?? [];
    list.push(house.id);
    housesByLocation.set(house.locationId, list);
  });

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const houseById = new Map(houses.map((h) => [h.id, h]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        locationId: form.locationId,
        houseId: form.houseId,
        name: form.name.trim(),
        flockNumber: form.flockNumber.trim().toUpperCase(),
        type: form.type,
        ...(form.breed.trim() ? { breed: form.breed.trim() } : {}),
        arrivalDate: new Date(form.arrivalDate).toISOString(),
        initialQuantity: Number(form.initialQuantity) || 0,
        status: form.status,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      };

      if (editing) {
        return updateFlock(editing.id, input);
      }
      return createFlock(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(editing ? "Flock updated" : "Flock created");
      void queryClient.invalidateQueries({
        queryKey: ["flocks", businessId],
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
    setForm({
      ...EMPTY_FORM,
      locationId: locations[0]?.id ?? "",
      houseId: houses[0]?.id ?? "",
      arrivalDate: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const openEdit = (flock: Flock) => {
    setEditing(flock);
    setForm({
      locationId: flock.locationId,
      houseId: flock.houseId,
      name: flock.name,
      flockNumber: flock.flockNumber,
      type: flock.type,
      breed: flock.breed ?? "",
      arrivalDate: flock.arrivalDate?.slice(0, 10) ?? "",
      initialQuantity: String(flock.initialQuantity),
      status: flock.status,
      notes: flock.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.locationId || !form.houseId) {
      toast.error("Choose a location and house for this flock");
      return;
    }

    if (!form.name.trim() || form.flockNumber.trim().length < 2) {
      toast.error("Name and flock number are required");
      return;
    }

    if (!/^[A-Za-z0-9-]+$/.test(form.flockNumber.trim())) {
      toast.error(
        "Flock number can only contain letters, numbers, and hyphens"
      );
      return;
    }

    if (!form.arrivalDate) {
      toast.error("Arrival date is required");
      return;
    }

    if (!editing && Number(form.initialQuantity) <= 0) {
      toast.error("Initial quantity must be greater than zero");
      return;
    }

    saveMutation.mutate();
  };

  const flocks = flocksQuery.data ?? [];
  const availableHouses = housesByLocation.get(form.locationId) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flocks</h1>
          <p className="text-sm text-muted-foreground">
            Every batch of birds for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={locations.length === 0 || houses.length === 0}
        >
          <Plus /> Add flock
        </Button>
      </div>

      {(locations.length === 0 || houses.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {locations.length === 0
                ? "Create locations first (Inventory > Locations)."
                : "Create houses first (Inventory > Houses)."}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All flocks</CardTitle>
          <CardDescription>
            {flocksQuery.isLoading
              ? "Loading flocks..."
              : `${flocks.length} flocks`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flock</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>House</TableHead>
                <TableHead className="text-right">Initial birds</TableHead>
                <TableHead>Arrived</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flocksQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c", "d", "e"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : flocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bird className="size-4" />
                      No flocks yet. Record your first batch of birds!
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                flocks.map((flock) => (
                  <TableRow key={flock.id}>
                    <TableCell className="font-medium">
                      {flock.name}
                      <div className="font-mono text-xs text-muted-foreground">
                        {flock.flockNumber}
                        {flock.breed ? ` — ${flock.breed}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[flock.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {houseById.get(flock.houseId)?.name ?? "—"}
                      <div className="text-xs">
                        {locationById.get(flock.locationId)?.name ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {flock.initialQuantity.toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flock.arrivalDate
                        ? new Date(flock.arrivalDate).toLocaleDateString(
                            "en-NG"
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          flock.status === "ACTIVE"
                            ? "default"
                            : flock.status === "SOLD"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {flock.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(flock)}
                      >
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit flock" : "Add flock"}</DialogTitle>
            <DialogDescription>
              A flock is a batch of birds living in one house.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={form.locationId}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      locationId: value,
                      houseId: "",
                    })
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
              <div className="space-y-2">
                <Label>House</Label>
                <Select
                  value={form.houseId}
                  onValueChange={(value) =>
                    setForm({ ...form, houseId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select house" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses
                      .filter((house) => availableHouses.includes(house.id))
                      .map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flock-name">Name</Label>
                <Input
                  id="flock-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flock-number">Flock number</Label>
                <Input
                  id="flock-number"
                  value={form.flockNumber}
                  onChange={(event) =>
                    setForm({ ...form, flockNumber: event.target.value })
                  }
                  placeholder="e.g. F-2026-01"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as FormState["type"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BROILER">Broiler</SelectItem>
                    <SelectItem value="LAYER">Layer</SelectItem>
                    <SelectItem value="BREEDER">Breeder</SelectItem>
                    <SelectItem value="PULLET">Pullet</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flock-breed">Breed (optional)</Label>
                <Input
                  id="flock-breed"
                  value={form.breed}
                  onChange={(event) =>
                    setForm({ ...form, breed: event.target.value })
                  }
                  placeholder="e.g. Isa Brown"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flock-arrival">Arrival date</Label>
                <Input
                  id="flock-arrival"
                  type="date"
                  value={form.arrivalDate}
                  onChange={(event) =>
                    setForm({ ...form, arrivalDate: event.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flock-quantity">Initial quantity</Label>
                <Input
                  id="flock-quantity"
                  type="number"
                  min={1}
                  value={form.initialQuantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      initialQuantity: event.target.value,
                    })
                  }
                  disabled={Boolean(editing)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      status: value as FormState["status"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flock-notes">Notes (optional)</Label>
              <Input
                id="flock-notes"
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
                    : "Add flock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

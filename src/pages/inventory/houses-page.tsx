import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Home, Pencil } from "lucide-react";
import { listHouses, createHouse, updateHouse, type House } from "@/api/houses";
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

const TYPE_LABELS: Record<House["type"], string> = {
  BROODER: "Brooder",
  LAYER: "Layer",
  BROILER: "Broiler",
  BREEDER: "Breeder",
  GENERAL: "General",
};

interface FormState {
  locationId: string;
  name: string;
  code: string;
  type: House["type"];
  capacity: string;
  status: House["status"];
}

const EMPTY_FORM: FormState = {
  locationId: "",
  name: "",
  code: "",
  type: "LAYER",
  capacity: "",
  status: "ACTIVE",
};

export function HousesPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<House | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const housesQuery = useQuery({
    queryKey: ["houses", businessId],
    queryFn: () => listHouses(businessId as string),
    enabled: Boolean(businessId),
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", businessId],
    queryFn: () => listLocations(businessId as string),
    enabled: Boolean(businessId),
  });

  const locations = locationsQuery.data ?? [];

  const locationById = new Map(locations.map((l) => [l.id, l.name]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (locations.length === 0) {
        throw new Error("Create a location first");
      }

      const capacity = Number(form.capacity);

      const input = {
        locationId: form.locationId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        ...(capacity > 0 ? { capacity } : {}),
        status: form.status,
      };

      if (editing) {
        return updateHouse(editing.id, input);
      }
      return createHouse(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(editing ? "House updated" : "House created");
      void queryClient.invalidateQueries({
        queryKey: ["houses", businessId],
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
    });
    setDialogOpen(true);
  };

  const openEdit = (house: House) => {
    setEditing(house);
    setForm({
      locationId: house.locationId,
      name: house.name,
      code: house.code,
      type: house.type,
      capacity: house.capacity ? String(house.capacity) : "",
      status: house.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.locationId) {
      toast.error("Choose the location this house belongs to");
      return;
    }

    if (!form.name.trim() || form.code.trim().length < 2) {
      toast.error("Name and a code of at least 2 characters are required");
      return;
    }

    if (!/^[A-Za-z0-9-]+$/.test(form.code.trim())) {
      toast.error(
        "Code can only contain letters, numbers, and hyphens"
      );
      return;
    }

    saveMutation.mutate();
  };

  const houses = housesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Houses</h1>
          <p className="text-sm text-muted-foreground">
            Poultry houses where flocks live for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={locations.length === 0}
        >
          <Plus /> Add house
        </Button>
      </div>

      {locations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Houses live inside locations. Add a location first on the
              Locations page.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All houses</CardTitle>
          <CardDescription>
            {housesQuery.isLoading
              ? "Loading houses..."
              : `${houses.length} houses`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {housesQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c", "d"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : houses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="size-4" />
                      No houses yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                houses.map((house) => (
                  <TableRow key={house.id}>
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {house.code}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[house.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {locationById.get(house.locationId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {house.capacity?.toLocaleString("en-NG") ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          house.status === "ACTIVE" ? "default" : "outline"
                        }
                      >
                        {house.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(house)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit house" : "Add house"}</DialogTitle>
            <DialogDescription>
              Houses group flocks by purpose (layers, broilers...).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Location</Label>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="house-name">Name</Label>
                <Input
                  id="house-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="house-code">Code</Label>
                <Input
                  id="house-code"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                  placeholder="e.g. H-01"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as FormState["type"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BROODER">Brooder</SelectItem>
                    <SelectItem value="LAYER">Layer</SelectItem>
                    <SelectItem value="BROILER">Broiler</SelectItem>
                    <SelectItem value="BREEDER">Breeder</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="house-capacity">Capacity (birds)</Label>
                <Input
                  id="house-capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(event) =>
                    setForm({ ...form, capacity: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as FormState["status"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
                    : "Add house"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

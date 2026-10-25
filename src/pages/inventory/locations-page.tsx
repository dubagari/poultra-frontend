import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MapPin, Pencil } from "lucide-react";
import {
  listLocations,
  createLocation,
  updateLocation,
  type Location,
} from "@/api/locations";
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

const TYPE_LABELS: Record<Location["type"], string> = {
  FARM: "Farm",
  FEED_STORE: "Feed store",
  PROCESSING_CENTER: "Processing center",
  WAREHOUSE: "Warehouse",
  OFFICE: "Office",
  SHOP: "Shop",
};

interface FormState {
  name: string;
  code: string;
  type: Location["type"];
  address: string;
  phone: string;
  status: Location["status"];
}

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  type: "FARM",
  address: "",
  phone: "",
  status: "ACTIVE",
};

export function LocationsPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const locationsQuery = useQuery({
    queryKey: ["locations", businessId],
    queryFn: () => listLocations(businessId as string),
    enabled: Boolean(businessId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        status: form.status,
      };

      if (editing) {
        return updateLocation(editing.id, input);
      }
      return createLocation(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(editing ? "Location updated" : "Location created");
      void queryClient.invalidateQueries({
        queryKey: ["locations", businessId],
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

  const openEdit = (location: Location) => {
    setEditing(location);
    setForm({
      name: location.name,
      code: location.code,
      type: location.type,
      address: location.address ?? "",
      phone: location.phone ?? "",
      status: location.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

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

  const locations = locationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Farms, stores and other sites for {activeBusiness?.name}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add location
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All locations</CardTitle>
          <CardDescription>
            {locationsQuery.isLoading
              ? "Loading locations..."
              : `${locations.length} locations`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationsQuery.isLoading ? (
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
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4" />
                      No locations yet. Every farm, store and shop lives here.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.name}
                      {location.phone && (
                        <div className="text-xs text-muted-foreground">
                          {location.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {location.code}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[location.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.address ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          location.status === "ACTIVE"
                            ? "default"
                            : "outline"
                        }
                      >
                        {location.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(location)}
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
            <DialogTitle>
              {editing ? "Edit location" : "Add location"}
            </DialogTitle>
            <DialogDescription>
              Locations hold inventory and houses.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-code">Code</Label>
                <Input
                  id="location-code"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                  placeholder="e.g. FARM-01"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm({ ...form, type: value as FormState["type"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FARM">Farm</SelectItem>
                  <SelectItem value="FEED_STORE">Feed store</SelectItem>
                  <SelectItem value="PROCESSING_CENTER">
                    Processing center
                  </SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="OFFICE">Office</SelectItem>
                  <SelectItem value="SHOP">Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address">Address (optional)</Label>
              <Input
                id="location-address"
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-phone">Phone (optional)</Label>
                <Input
                  id="location-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
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
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    : "Add location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

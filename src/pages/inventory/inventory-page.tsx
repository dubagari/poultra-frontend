import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Warehouse, TriangleAlert, Pencil } from "lucide-react";
import {
  listStock,
  createStockEntry,
  updateStockEntry,
  type StockEntry,
} from "@/api/stock";
import { listProducts, type Product } from "@/api/products";
import { listLocations, type Location } from "@/api/locations";
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

interface FormState {
  productId: string;
  locationId: string;
  quantity: string;
  unit: StockEntry["unit"];
  lowStockThreshold: string;
}

const EMPTY_FORM: FormState = {
  productId: "",
  locationId: "",
  quantity: "0",
  unit: "PIECE",
  lowStockThreshold: "10",
};

export function InventoryPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const stockQuery = useQuery({
    queryKey: ["inventory", businessId],
    queryFn: () => listStock(businessId as string),
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

  const products: Product[] = productsQuery.data ?? [];
  const locations: Location[] = locationsQuery.data ?? [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateStockEntry(editing.id, {
          status: editing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          lowStockThreshold: Number(form.lowStockThreshold),
        });
      }

      return createStockEntry(businessId as string, {
        productId: form.productId,
        locationId: form.locationId,
        quantity: Number(form.quantity) || 0,
        lowStockThreshold:
          Number(form.lowStockThreshold) || undefined,
        unit: form.unit,
      });
    },
    onSuccess: () => {
      toast.success(
        editing ? "Stock entry updated" : "Stock entry created"
      );
      void queryClient.invalidateQueries({
        queryKey: ["inventory", businessId],
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
      productId: products[0]?.id ?? "",
      locationId: locations[0]?.id ?? "",
      unit: products[0]?.unit ?? "PIECE",
    });
    setDialogOpen(true);
  };

  const openEdit = (entry: StockEntry) => {
    setEditing(entry);
    setForm({
      ...EMPTY_FORM,
      lowStockThreshold: String(entry.lowStockThreshold),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (editing) {
      saveMutation.mutate();
      return;
    }

    if (!form.productId || !form.locationId) {
      toast.error("Choose a product and location");
      return;
    }

    const duplicate = (stockQuery.data ?? []).some(
      (entry) =>
        entry.productId === form.productId &&
        entry.locationId === form.locationId
    );

    if (duplicate) {
      toast.error(
        "This product already has a stock entry at this location"
      );
      return;
    }

    saveMutation.mutate();
  };

  const stock = stockQuery.data ?? [];
  const lowStockCount = stock.filter(
    (entry) =>
      entry.status === "ACTIVE" &&
      entry.quantity <= entry.lowStockThreshold
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Stock tracked per product and location
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={products.length === 0 || locations.length === 0}
        >
          <Plus /> Add stock entry
        </Button>
      </div>

      {lowStockCount > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-center gap-2 pt-6">
            <TriangleAlert className="size-4 text-amber-500" />
            <p className="text-sm">
              {lowStockCount} stock entr
              {lowStockCount === 1 ? "y is" : "ies are"} running low. Consider
              restocking.
            </p>
          </CardContent>
        </Card>
      )}

      {(products.length === 0 || locations.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {products.length === 0
                ? "Create products first (Products page)."
                : "Create locations first (Locations page)."}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All stock</CardTitle>
          <CardDescription>
            {stockQuery.isLoading
              ? "Loading stock..."
              : `${stock.length} entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Low-stock at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : stock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Warehouse className="size-4" />
                      No stock tracked yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                stock.map((entry) => {
                  const product = productById.get(entry.productId);
                  const isLow =
                    entry.status === "ACTIVE" &&
                    entry.quantity <= entry.lowStockThreshold;

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {product?.name ?? "Unknown product"}
                        <div className="font-mono text-xs text-muted-foreground">
                          {product?.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {locationById.get(entry.locationId)?.name ?? "—"}
                      </TableCell>
                      <TableCell
                        className={
                          isLow ? "font-medium text-amber-600" : "text-right"
                        }
                      >
                        <span className={isLow ? "" : ""}>
                          {entry.quantity.toLocaleString("en-NG")}{" "}
                          {entry.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.availableQuantity.toLocaleString("en-NG")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {entry.lowStockThreshold}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "ACTIVE"
                              ? "default"
                              : "outline"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(entry)}
                        >
                          <Pencil /> Toggle / Threshold
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Manage stock entry"
                : "Add stock entry"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Flip active/inactive or adjust the low-stock threshold."
                : "Track a product's stock at one location."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing ? (
              <div className="space-y-2">
                <Label>Active state</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      status:
                        editing.status === "ACTIVE"
                          ? "INACTIVE"
                          : "ACTIVE",
                    })
                  }
                >
                  Currently {editing.status}. Click to toggle to{" "}
                  {editing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}.
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={form.productId}
                    onValueChange={(value) => {
                      const product = productById.get(value);
                      setForm({
                        ...form,
                        productId: value,
                        unit: product?.unit ?? form.unit,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <Label htmlFor="stock-quantity">Quantity</Label>
                    <Input
                      id="stock-quantity"
                      type="number"
                      min={0}
                      value={form.quantity}
                      onChange={(event) =>
                        setForm({ ...form, quantity: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={form.unit}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          unit: value as FormState["unit"],
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="BAG">BAG</SelectItem>
                        <SelectItem value="PIECE">PIECE</SelectItem>
                        <SelectItem value="TRAY">TRAY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="stock-threshold">Low-stock threshold</Label>
              <Input
                id="stock-threshold"
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm({ ...form, lowStockThreshold: event.target.value })
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
                    ? "Save"
                    : "Add entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

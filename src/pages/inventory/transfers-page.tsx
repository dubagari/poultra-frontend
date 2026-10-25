import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ArrowLeftRight, Trash2 } from "lucide-react";
import {
  listTransfers,
  createTransfer,
} from "@/api/stock-transfers";
import { listStock } from "@/api/stock";
import { listProducts, type Product } from "@/api/products";
import { listLocations, type Location } from "@/api/locations";
import { useBusinesses } from "@/context/BusinessContext";
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

interface TransferRow {
  productId: string;
  quantity: number;
}

export function TransfersPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<TransferRow[]>([]);

  const transfersQuery = useQuery({
    queryKey: ["stock-transfers", businessId],
    queryFn: () => listTransfers(businessId as string),
    enabled: Boolean(businessId),
  });

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
  const stock = stockQuery.data ?? [];

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const locationById = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations]
  );

  // Available stock at the chosen source location, per product.
  const availableAtSource = useMemo(() => {
    if (!fromLocationId) return new Map<string, number>();
    const map = new Map<string, number>();
    stock
      .filter((entry) => entry.locationId === fromLocationId)
      .forEach((entry) => map.set(entry.productId, entry.quantity));
    return map;
  }, [stock, fromLocationId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!fromLocationId || !toLocationId) {
        throw new Error("Choose both source and destination locations");
      }
      if (fromLocationId === toLocationId) {
        throw new Error(
          "Source and destination locations must be different"
        );
      }
      if (
        rows.length === 0 ||
        rows.some((row) => !row.productId || row.quantity <= 0)
      ) {
        throw new Error("Add at least one product with a positive quantity");
      }

      return createTransfer(businessId as string, {
        fromLocationId,
        toLocationId,
        items: rows.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
        })),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Stock transferred");
      void queryClient.invalidateQueries({
        queryKey: ["stock-transfers", businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", businessId],
      });
      setDialogOpen(false);
      setFromLocationId("");
      setToLocationId("");
      setNotes("");
      setRows([]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const addRow = () => {
    setRows([...rows, { productId: "", quantity: 1 }]);
  };

  const updateRow = (index: number, patch: Partial<TransferRow>) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const transfers = transfersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move stock between locations for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={() => {
            setFromLocationId(locations[0]?.id ?? "");
            setToLocationId(locations[1]?.id ?? "");
            setRows([{ productId: "", quantity: 1 }]);
            setDialogOpen(true);
          }}
          disabled={locations.length < 2 || products.length === 0}
        >
          <Plus /> New transfer
        </Button>
      </div>

      {locations.length < 2 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              A transfer needs two different locations. Add more locations
              first.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer history</CardTitle>
          <CardDescription>
            {transfersQuery.isLoading
              ? "Loading transfers..."
              : `${transfers.length} transfers`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer no</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total qty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfersQuery.isLoading ? (
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
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowLeftRight className="size-4" />
                      No transfers yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {locationById.get(transfer.fromLocationId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {locationById.get(transfer.toLocationId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {transfer.items
                        .map(
                          (item) =>
                            `${productById.get(item.productId)?.name ?? "?"} ×${item.quantity}`
                        )
                        .join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.items
                        .reduce((sum, item) => sum + item.quantity, 0)
                        .toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transfer.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New transfer</DialogTitle>
            <DialogDescription>
              Move stock from one location to another.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From</Label>
                <Select
                  value={fromLocationId}
                  onValueChange={(value) => {
                    setFromLocationId(value);
                    setRows([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((l) => l.id !== toLocationId)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select
                  value={toLocationId}
                  onValueChange={setToLocationId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((l) => l.id !== fromLocationId)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  disabled={!fromLocationId}
                >
                  <Plus /> Add product
                </Button>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one product.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row, index) => {
                    const available =
                      availableAtSource.get(row.productId) ?? 0;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                      >
                        <Select
                          value={row.productId}
                          onValueChange={(value) =>
                            updateRow(index, { productId: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(
                                (product) =>
                                  availableAtSource.has(product.id)
                              )
                              .map((product) => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id}
                                >
                                  {product.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          max={available || undefined}
                          value={row.quantity}
                          onChange={(event) =>
                            updateRow(index, {
                              quantity: Number(event.target.value),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 />
                        </Button>
                        <span className="col-span-3 text-xs text-muted-foreground">
                          {row.productId
                            ? `${available} at source`
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-notes">Notes (optional)</Label>
              <Input
                id="transfer-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

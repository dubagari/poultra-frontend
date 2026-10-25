import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShoppingCart, Trash2, Banknote, X } from "lucide-react";
import { listOrders, createOrder, payOrder, cancelOrder } from "@/api/orders";
import { createCart, addCartItem } from "@/api/carts";
import { listCustomers, type Customer } from "@/api/customers";
import { listInventory, type InventoryItem } from "@/api/inventory";
import { listProducts, type Product } from "@/api/products";
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
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  DELIVERED: "secondary",
  CANCELLED: "destructive",
  PENDING: "outline",
  PAID: "default",
};

interface CartRow {
  inventoryId: string;
  quantity: number;
  unitPrice: number;
}

export function OrdersPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [ordersSearch, setOrdersSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<CartRow[]>([]);

  const ordersQuery = useQuery({
    queryKey: ["orders", businessId],
    queryFn: () => listOrders(businessId as string),
    enabled: Boolean(businessId),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", businessId],
    queryFn: () => listCustomers(businessId as string),
    enabled: Boolean(businessId),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", businessId],
    queryFn: () => listInventory(businessId as string),
    enabled: Boolean(businessId),
  });

  const productsQuery = useQuery({
    queryKey: ["products", businessId],
    queryFn: () => listProducts(businessId as string),
    enabled: Boolean(businessId),
  });

  const customers: Customer[] = customersQuery.data ?? [];
  const inventory: InventoryItem[] = inventoryQuery.data ?? [];
  const products: Product[] = useMemo(
    () => (productsQuery.data ?? []).filter((p) => p.status === "ACTIVE"),
    [productsQuery.data]
  );

  const inventoryById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach((item) => map.set(item.id, item));
    return map;
  }, [inventory]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const orders = ordersQuery.data ?? [];
  const filtered = orders.filter((order) => {
    if (!ordersSearch.trim()) return true;
    const needle = ordersSearch.trim().toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(needle) ||
      order.status.toLowerCase().includes(needle)
    );
  });

  const previewTotal = rows.reduce(
    (sum, row) => sum + row.quantity * row.unitPrice,
    0
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Choose a customer first");
      if (rows.length === 0)
        throw new Error("Add at least one item to the order");

      let cartId = "";

      const stockCheck = rows.some((row) => {
        const item = inventoryById.get(row.inventoryId);
        return (item?.availableQuantity ?? 0) < row.quantity;
      });

      if (stockCheck) {
        throw new Error("One of the selected quantities exceeds available stock");
      }

      const cart = await createCart(businessId as string, customerId);
      cartId = cart.id;

      for (const row of rows) {
        const item = inventoryById.get(row.inventoryId);
        await addCartItem(cartId, {
          inventoryId: row.inventoryId,
          productId: item?.productId ?? "",
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        });
      }

      return createOrder(cartId, notes.trim() || undefined);
    },
    onSuccess: () => {
      toast.success("Order created");
      void queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", businessId] });
      setDialogOpen(false);
      setCustomerId("");
      setNotes("");
      setRows([]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const payMutation = useMutation({
    mutationFn: async (orderId: string) =>
      payOrder(businessId as string, orderId),
    onSuccess: () => {
      toast.success("Order marked as paid");
      void queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as paid"
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) =>
      cancelOrder(businessId as string, orderId),
    onSuccess: () => {
      toast.success("Order cancelled, stock returned");
      void queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", businessId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel order"
      );
    },
  });

  const addRow = () => {
    setRows([...rows, { inventoryId: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateRow = (index: number, patch: Partial<CartRow>) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Sales recorded against stock for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={
            (customersQuery.data?.length ?? 0) === 0 ||
            (inventory.length ?? 0) === 0
          }
        >
          <Plus /> New order
        </Button>
      </div>

      {(customers.length === 0 || inventory.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {customers.length === 0
                ? "Add a customer first to create orders."
                : "Create at least one inventory entry with stock before taking orders."}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All orders</CardTitle>
          <CardDescription>
            {ordersQuery.isLoading
              ? "Loading orders..."
              : `${filtered.length} orders`}
          </CardDescription>
          <Input
            placeholder="Search by order number or status"
            value={ordersSearch}
            onChange={(event) => setOrdersSearch(event.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order no</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShoppingCart className="size-4" />
                      {ordersSearch
                        ? "No orders match your search"
                        : "No orders yet. Create one from existing stock!"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const customer = customers.find((c) => c.id === order.customerId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                        {customer && (
                          <div className="text-xs text-muted-foreground">
                            {customer.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.items.length} item(s)
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₦{order.totalAmount.toLocaleString("en-NG")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANTS[order.paymentStatus]}
                        >
                          {order.paymentStatus === "PAID" ? (
                            <Banknote className="size-3" />
                          ) : null}
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[order.status]}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {order.status === "CONFIRMED" &&
                            order.paymentStatus === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={payMutation.isPending}
                                onClick={() => payMutation.mutate(order.id)}
                              >
                                Mark paid
                              </Button>
                            )}
                          {(order.status === "CONFIRMED" ||
                            order.status === "DELIVERED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate(order.id)}
                            >
                              <X /> Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setRows([]);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New order</DialogTitle>
            <DialogDescription>
              Build the cart and convert it into an order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={customerId}
                onValueChange={setCustomerId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                >
                  <Plus /> Add item
                </Button>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one item.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row, index) => {
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_0.5fr_0.75fr_auto] items-center gap-2"
                      >
                        <Select
                          value={row.inventoryId}
                          onValueChange={(value) => {
                            updateRow(index, {
                              inventoryId: value,
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stock item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((inv) => {
                              const product = productById.get(inv.productId);
                              return (
                                <SelectItem
                                  key={inv.id}
                                  value={inv.id}
                                  disabled={inv.availableQuantity <= 0}
                                >
                                  {product?.name ?? "Unknown"} —{" "}
                                  {inv.availableQuantity} {inv.unit} available
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(event) =>
                            updateRow(index, {
                              quantity: Number(event.target.value),
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="₦"
                          value={row.unitPrice}
                          onChange={(event) =>
                            updateRow(index, {
                              unitPrice: Number(event.target.value),
                            })
                          }
                        />
                        <span
                          className={cn(
                            "text-sm text-muted-foreground w-20 text-right"
                          )}
                        >
                          ₦
                          {(row.quantity * row.unitPrice).toLocaleString(
                            "en-NG"
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-notes">Notes (optional)</Label>
              <Input
                id="order-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <p className="text-sm font-medium">
              Total: ₦{previewTotal.toLocaleString("en-NG")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

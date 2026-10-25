import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Truck, Play, Check, X, MapPin } from "lucide-react";
import {
  listDeliveries,
  createDelivery,
  startDelivery,
  completeDelivery,
  cancelDelivery,
} from "@/api/deliveries";
import { listOrders, type Order } from "@/api/orders";
import { listCustomers } from "@/api/customers";
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "outline",
  IN_TRANSIT: "default",
  DELIVERED: "secondary",
  CANCELLED: "destructive",
};

export function DeliveriesPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [driverName, setDriverName] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [scheduledAt, setScheduledAt] = useState("");

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries", businessId],
    queryFn: () => listDeliveries(businessId as string),
    enabled: Boolean(businessId),
  });

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

  const orders: Order[] = ordersQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const deliverableOrders = orders.filter(
    (order) =>
      order.status === "CONFIRMED" || order.status === "DELIVERED"
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Select an order to deliver");

      return createDelivery({
        businessId: businessId as string,
        orderId,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
        ...(recipientPhone.trim() ? { recipientPhone: recipientPhone.trim() } : {}),
        ...(driverName.trim() ? { driverName: driverName.trim() } : {}),
        deliveryFee: Number(deliveryFee) || 0,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Delivery scheduled");
      void queryClient.invalidateQueries({
        queryKey: ["deliveries", businessId],
      });
      setDialogOpen(false);
      setOrderId("");
      setAddress("");
      setRecipientName("");
      setRecipientPhone("");
      setDriverName("");
      setDeliveryFee("0");
      setScheduledAt("");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const startMutation = useMutation({
    mutationFn: async (deliveryId: string) =>
      startDelivery(businessId as string, deliveryId),
    onSuccess: () => {
      toast.success("Delivery started");
      void queryClient.invalidateQueries({
        queryKey: ["deliveries", businessId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to start delivery"
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (deliveryId: string) =>
      completeDelivery(businessId as string, deliveryId),
    onSuccess: () => {
      toast.success("Delivery completed");
      void queryClient.invalidateQueries({
        queryKey: ["deliveries", businessId],
      });
      void queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete delivery"
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (deliveryId: string) =>
      cancelDelivery(businessId as string, deliveryId),
    onSuccess: () => {
      toast.success("Delivery cancelled");
      void queryClient.invalidateQueries({
        queryKey: ["deliveries", businessId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel delivery"
      );
    },
  });

  const deliveries = deliveriesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            Track every order drop-off for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={deliverableOrders.length === 0}
        >
          <Plus /> Schedule delivery
        </Button>
      </div>

      {deliverableOrders.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Deliveries are scheduled against confirmed orders. Create an
              order first (Orders page), then come back here.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All deliveries</CardTitle>
          <CardDescription>
            {deliveriesQuery.isLoading
              ? "Loading deliveries..."
              : `${deliveries.length} deliveries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveriesQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="size-4" />
                      No deliveries scheduled yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => {
                  const order = orders.find((o) => o.id === delivery.orderId);
                  const customer = customers.find(
                    (c) => c.id === order?.customerId
                  );

                  return (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        {order?.orderNumber ?? delivery.orderId.slice(-6)}
                        {customer && (
                          <div className="text-xs text-muted-foreground">
                            {customer.name}
                          </div>
                        )}
                        {delivery.address && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {delivery.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {delivery.recipientName ?? "—"}
                        </div>
                        {delivery.recipientPhone && (
                          <div className="text-xs text-muted-foreground">
                            {delivery.recipientPhone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {delivery.driverName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        ₦{delivery.deliveryFee.toLocaleString("en-NG")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[delivery.status]}>
                          {delivery.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {delivery.status === "SCHEDULED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={startMutation.isPending}
                              onClick={() => startMutation.mutate(delivery.id)}
                            >
                              <Play /> Start
                            </Button>
                          )}
                          {delivery.status === "IN_TRANSIT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={completeMutation.isPending}
                              onClick={() =>
                                completeMutation.mutate(delivery.id)
                              }
                            >
                              <Check /> Complete
                            </Button>
                          )}
                          {(delivery.status === "SCHEDULED" ||
                            delivery.status === "IN_TRANSIT") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate(delivery.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule delivery</DialogTitle>
            <DialogDescription>
              Send a confirmed order out for delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {deliverableOrders.map((order) => {
                    const customer = customers.find(
                      (c) => c.id === order.customerId
                    );

                    return (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber}
                        {customer ? ` — ${customer.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-address">Address</Label>
              <Input
                id="delivery-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Defaults to order/customer details if provided"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-recipient">Recipient name</Label>
                <Input
                  id="delivery-recipient"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-recipient-phone">Recipient phone</Label>
                <Input
                  id="delivery-recipient-phone"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-driver">Driver name</Label>
                <Input
                  id="delivery-driver"
                  value={driverName}
                  onChange={(event) => setDriverName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Delivery fee (₦)</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  min={0}
                  value={deliveryFee}
                  onChange={(event) => setDeliveryFee(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-scheduled">Scheduled at</Label>
              <Input
                id="delivery-scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
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
              {createMutation.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

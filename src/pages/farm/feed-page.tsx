import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FlaskConical, XCircle, Wheat } from "lucide-react";
import { api } from "@/lib/api";
import {
  listFeedProducts,
  createFeedProduct,
  listFeedConsumptionHistory,
  createFeedConsumption,
  type FeedProduct,
  type FeedConsumption,
} from "@/api/feed";
import { listProducts } from "@/api/products";
import { listFlocks } from "@/api/flocks";
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

const FEED_TYPE_LABELS: Record<FeedProduct["feedType"], string> = {
  STARTER: "Starter",
  GROWER: "Grower",
  FINISHER: "Finisher",
  LAYER: "Layer",
  BREEDER: "Breeder",
  OTHER: "Other",
};

interface ConsumptionFormState {
  flockId: string;
  feedProductId: string;
  locationId: string;
  quantity: string;
  unit: FeedConsumption["unit"];
  consumptionDate: string;
  notes: string;
}

const EMPTY_CONSUMPTION: ConsumptionFormState = {
  flockId: "",
  feedProductId: "",
  locationId: "",
  quantity: "1",
  unit: "KG",
  consumptionDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function FeedPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [formulationOpen, setFormulationOpen] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newFeedType, setNewFeedType] =
    useState<FeedProduct["feedType"]>("STARTER");
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [consumptionForm, setConsumptionForm] = useState<ConsumptionFormState>(
    EMPTY_CONSUMPTION
  );

  const feedProductsQuery = useQuery({
    queryKey: ["feed-products", businessId],
    queryFn: () => listFeedProducts(businessId as string),
    enabled: Boolean(businessId),
  });

  const historyQuery = useQuery({
    queryKey: ["feed-consumption", businessId],
    queryFn: () => listFeedConsumptionHistory(businessId as string),
    enabled: Boolean(businessId),
  });

  const productsQuery = useQuery({
    queryKey: ["products", businessId],
    queryFn: () => listProducts(businessId as string),
    enabled: Boolean(businessId),
  });

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

  const feedProducts = feedProductsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const flocks = flocksQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const flockById = new Map(flocks.map((f) => [f.id, f]));
  const feedProductById = new Map(feedProducts.map((f) => [f.id, f]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const feedEligibleProducts = products.filter(
    (product) =>
      product.type === "FEED" &&
      product.status === "ACTIVE" &&
      !feedProducts.some(
        (feedProduct) => feedProduct.productId === product.id
      )
  );

  const createFormulation = useMutation({
    mutationFn: async () => {
      if (!newProductId) {
        throw new Error("Choose a FEED product to register");
      }

      return createFeedProduct(businessId as string, {
        productId: newProductId,
        feedType: newFeedType,
      });
    },
    onSuccess: () => {
      toast.success("Feed formulation registered");
      void queryClient.invalidateQueries({
        queryKey: ["feed-products", businessId],
      });
      setFormulationOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const createConsumption = useMutation({
    mutationFn: async () => {
      const flock = flockById.get(consumptionForm.flockId);
      const feedProduct = feedProductById.get(
        consumptionForm.feedProductId
      );

      if (!feedProduct) {
        throw new Error("Choose a registered feed formulation");
      }

      return createFeedConsumption(businessId as string, {
        flockId: consumptionForm.flockId,
        feedProductId: feedProduct.productId,
        locationId: flock?.locationId ?? "",
        quantity: Number(consumptionForm.quantity) || 0,
        unit: consumptionForm.unit,
        consumptionDate: new Date(
          consumptionForm.consumptionDate
        ).toISOString(),
        ...(consumptionForm.notes.trim()
          ? { notes: consumptionForm.notes.trim() }
          : {}),
      });
    },
    onSuccess: () => {
      toast.success("Feed consumption recorded, stock deducted");
      void queryClient.invalidateQueries({
        queryKey: ["feed-consumption", businessId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", businessId],
      });
      setConsumptionOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const cancelConsumption = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await api.patch<{
        success: boolean;
        message?: string;
      }>(`/feed-consumption/${recordId}`, { status: "CANCELLED" });

      if (!response.data.success) {
        throw new Error(
          response.data.message ?? "Failed to cancel feed record"
        );
      }
    },
    onSuccess: () => {
      toast.success("Feed record cancelled");
      void queryClient.invalidateQueries({
        queryKey: ["feed-consumption", businessId],
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

  const history = historyQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="text-sm text-muted-foreground">
          Feed formulations and what each flock has eaten
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="size-4" />
                Feed formulations
              </CardTitle>
              <CardDescription>
                Registered FEED products by growth stage
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewProductId(feedEligibleProducts[0]?.id ?? "");
                setFormulationOpen(true);
              }}
              disabled={feedEligibleProducts.length === 0}
            >
              <Plus /> Register formulation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Feed type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedProductsQuery.isLoading ? (
                [1, 2].map((row) => (
                  <TableRow key={row}>
                    {["a", "b"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : feedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No feed formulations yet. Register a FEED product above.
                  </TableCell>
                </TableRow>
              ) : (
                feedProducts.map((feedProduct) => {
                  const product = productById.get(feedProduct.productId);

                  return (
                    <TableRow key={feedProduct.id}>
                      <TableCell className="font-medium">
                        {product?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {product?.code ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {FEED_TYPE_LABELS[feedProduct.feedType]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wheat className="size-4" />
                Consumption history
              </CardTitle>
              <CardDescription>
                {historyQuery.isLoading
                  ? "Loading..."
                  : `${history.length} records`}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setConsumptionForm({
                  ...EMPTY_CONSUMPTION,
                  flockId: flocks.filter((f) => f.status === "ACTIVE")[0]?.id ??
                    "",
                  feedProductId: feedProducts[0]?.id ?? "",
                });
                setConsumptionOpen(true);
              }}
              disabled={feedProducts.length === 0 || flocks.length === 0}
            >
              <Plus /> Record consumption
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Feed</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.isLoading ? (
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
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No feed consumption recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.consumptionDate).toLocaleDateString(
                        "en-NG"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flockById.get(record.flockId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {productById.get(record.feedProductId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.quantity.toLocaleString("en-NG")} {record.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {locationById.get(record.locationId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "RECORDED"
                            ? "default"
                            : "outline"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status === "RECORDED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={cancelConsumption.isPending}
                          onClick={() => cancelConsumption.mutate(record.id)}
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

      <Dialog open={formulationOpen} onOpenChange={setFormulationOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Register feed formulation</DialogTitle>
            <DialogDescription>
              Pick a FEED product and tag it with its growth stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={newProductId}
                onValueChange={setNewProductId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {feedEligibleProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feed type</Label>
              <Select
                value={newFeedType}
                onValueChange={(value) =>
                  setNewFeedType(value as FeedProduct["feedType"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="GROWER">Grower</SelectItem>
                  <SelectItem value="FINISHER">Finisher</SelectItem>
                  <SelectItem value="LAYER">Layer</SelectItem>
                  <SelectItem value="BREEDER">Breeder</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormulationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createFormulation.mutate()}
              disabled={createFormulation.isPending}
            >
              {createFormulation.isPending ? "Saving..." : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={consumptionOpen} onOpenChange={setConsumptionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record feed consumption</DialogTitle>
            <DialogDescription>
              Quantity is deducted from stock at the flock's location.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createConsumption.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Flock</Label>
              <Select
                value={consumptionForm.flockId}
                onValueChange={(value) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    flockId: value,
                  })
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
            <div className="space-y-2">
              <Label>Feed formulation</Label>
              <Select
                value={consumptionForm.feedProductId}
                onValueChange={(value) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    feedProductId: value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select feed" />
                </SelectTrigger>
                <SelectContent>
                  {feedProducts.map((feedProduct) => {
                    const product = productById.get(feedProduct.productId);

                    return (
                      <SelectItem key={feedProduct.id} value={feedProduct.id}>
                        {product?.name ?? "—"} (
                        {FEED_TYPE_LABELS[feedProduct.feedType]})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="feed-qty">Quantity</Label>
                <Input
                  id="feed-qty"
                  type="number"
                  min={0}
                  step="any"
                  value={consumptionForm.quantity}
                  onChange={(event) =>
                    setConsumptionForm({
                      ...consumptionForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={consumptionForm.unit}
                  onValueChange={(value) =>
                    setConsumptionForm({
                      ...consumptionForm,
                      unit: value as FeedConsumption["unit"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">kg</SelectItem>
                    <SelectItem value="BAG">bags</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-date">Date</Label>
                <Input
                  id="feed-date"
                  type="date"
                  value={consumptionForm.consumptionDate}
                  onChange={(event) =>
                    setConsumptionForm({
                      ...consumptionForm,
                      consumptionDate: event.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-notes">Notes (optional)</Label>
              <Input
                id="feed-notes"
                value={consumptionForm.notes}
                onChange={(event) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    notes: event.target.value,
                  })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConsumptionOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createConsumption.isPending}>
                {createConsumption.isPending ? "Saving..." : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

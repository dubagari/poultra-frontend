import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Egg, XCircle } from "lucide-react";
import {
  listEggProductions,
  createEggProduction,
  cancelEggProduction,
  type EggProduction,
} from "@/api/egg-production";
import { listFlocks, type Flock } from "@/api/flocks";
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
  flockId: string;
  productionDate: string;
  goodEggs: string;
  brokenEggs: string;
  unit: EggProduction["unit"];
  notes: string;
}

export function EggProductionPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    flockId: "",
    productionDate: new Date().toISOString().slice(0, 10),
    goodEggs: "0",
    brokenEggs: "0",
    unit: "PIECE",
    notes: "",
  });

  const recordsQuery = useQuery({
    queryKey: ["egg-production", businessId],
    queryFn: () => listEggProductions(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocksQuery = useQuery({
    queryKey: ["flocks", businessId],
    queryFn: () => listFlocks(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocks: Flock[] = flocksQuery.data ?? [];
  const flockById = new Map(flocks.map((f) => [f.id, f]));

  const createMutation = useMutation({
    mutationFn: async () => {
      const flock = flockById.get(form.flockId);

      if (!flock) {
        throw new Error("Choose a flock for this record");
      }

      return createEggProduction(businessId as string, {
        flockId: form.flockId,
        locationId: flock.locationId,
        productionDate: new Date(form.productionDate).toISOString(),
        goodEggs: Number(form.goodEggs) || 0,
        brokenEggs: Number(form.brokenEggs) || 0,
        unit: form.unit,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Egg production recorded");
      void queryClient.invalidateQueries({
        queryKey: ["egg-production", businessId],
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (recordId: string) =>
      cancelEggProduction(recordId),
    onSuccess: () => {
      toast.success("Record cancelled");
      void queryClient.invalidateQueries({
        queryKey: ["egg-production", businessId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel record"
      );
    },
  });

  const records = recordsQuery.data ?? [];
  const totalGood = records
    .filter((record) => record.status === "RECORDED")
    .reduce((sum, record) => sum + record.goodEggs, 0);
  const totalBroken = records
    .filter((record) => record.status === "RECORDED")
    .reduce((sum, record) => sum + record.brokenEggs, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Egg production
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily collection logs for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={flocks.length === 0}
        >
          <Plus /> Record collection
        </Button>
      </div>

      {flocks.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Create a flock first (Flocks page) to start recording egg
              production.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Good eggs collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {totalGood.toLocaleString("en-NG")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Broken eggs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {totalBroken.toLocaleString("en-NG")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All records</CardTitle>
          <CardDescription>
            {recordsQuery.isLoading
              ? "Loading records..."
              : `${records.length} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead className="text-right">Good</TableHead>
                <TableHead className="text-right">Broken</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsQuery.isLoading ? (
                [1, 2, 3].map((row) => (
                  <TableRow key={row}>
                    {["a", "b", "c"].map((key) => (
                      <TableCell key={key}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-12" />
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-5 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Egg className="size-4" />
                      No records yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.productionDate).toLocaleDateString(
                        "en-NG"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flockById.get(record.flockId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.goodEggs.toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {record.brokenEggs.toLocaleString("en-NG")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(record.goodEggs + record.brokenEggs).toLocaleString(
                        "en-NG"
                      )}{" "}
                      {record.unit}
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
            <DialogTitle>Record egg collection</DialogTitle>
            <DialogDescription>
              Log today's collection for a flock.
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
                <Label htmlFor="egg-date">Production date</Label>
                <Input
                  id="egg-date"
                  type="date"
                  value={form.productionDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      productionDate: event.target.value,
                    })
                  }
                  required
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
                    <SelectItem value="PIECE">Piece</SelectItem>
                    <SelectItem value="TRAY">Tray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="egg-good">Good eggs</Label>
                <Input
                  id="egg-good"
                  type="number"
                  min={0}
                  value={form.goodEggs}
                  onChange={(event) =>
                    setForm({ ...form, goodEggs: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="egg-broken">Broken eggs</Label>
                <Input
                  id="egg-broken"
                  type="number"
                  min={0}
                  value={form.brokenEggs}
                  onChange={(event) =>
                    setForm({ ...form, brokenEggs: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="egg-notes">Notes (optional)</Label>
              <Input
                id="egg-notes"
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? "Recording..."
                  : "Record collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

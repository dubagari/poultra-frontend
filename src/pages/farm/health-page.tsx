import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, HeartPulse } from "lucide-react";
import {
  listHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  type HealthRecord,
} from "@/api/health";
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

const EVENT_LABELS: Record<HealthRecord["eventType"], string> = {
  OBSERVATION: "Observation",
  ILLNESS: "Illness",
  TREATMENT: "Treatment",
  VACCINATION: "Vaccination",
  RECOVERY: "Recovery",
  MORTALITY: "Mortality",
};

interface FormState {
  flockId: string;
  eventDate: string;
  eventType: HealthRecord["eventType"];
  status: HealthRecord["status"];
  symptoms: string;
  diagnosis: string;
  treatment: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  flockId: "",
  eventDate: new Date().toISOString().slice(0, 10),
  eventType: "OBSERVATION",
  status: "NORMAL",
  symptoms: "",
  diagnosis: "",
  treatment: "",
  notes: "",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NORMAL: "outline",
  MONITORING: "default",
  TREATED: "secondary",
  RECOVERED: "secondary",
  CRITICAL: "destructive",
};

export function HealthPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const recordsQuery = useQuery({
    queryKey: ["health", businessId],
    queryFn: () => listHealthRecords(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocksQuery = useQuery({
    queryKey: ["flocks", businessId],
    queryFn: () => listFlocks(businessId as string),
    enabled: Boolean(businessId),
  });

  const flocks: Flock[] = flocksQuery.data ?? [];
  const flockById = new Map(flocks.map((f) => [f.id, f]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        flockId: form.flockId,
        eventDate: new Date(form.eventDate).toISOString(),
        eventType: form.eventType,
        status: form.status,
        ...(form.symptoms.trim() ? { symptoms: form.symptoms.trim() } : {}),
        ...(form.diagnosis.trim()
          ? { diagnosis: form.diagnosis.trim() }
          : {}),
        ...(form.treatment.trim()
          ? { treatment: form.treatment.trim() }
          : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      };

      if (editing) {
        return updateHealthRecord(editing.id, input);
      }
      return createHealthRecord(businessId as string, input);
    },
    onSuccess: () => {
      toast.success(
        editing ? "Health record updated" : "Health record created"
      );
      void queryClient.invalidateQueries({
        queryKey: ["health", businessId],
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
      flockId: flocks[0]?.id ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (record: HealthRecord) => {
    setEditing(record);
    setForm({
      flockId: record.flockId,
      eventDate: record.eventDate?.slice(0, 10) ?? "",
      eventType: record.eventType,
      status: record.status,
      symptoms: record.symptoms ?? "",
      diagnosis: record.diagnosis ?? "",
      treatment: record.treatment ?? "",
      notes: record.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.flockId) {
      toast.error("Choose the flock this record belongs to");
      return;
    }

    if (!form.eventDate) {
      toast.error("Event date is required");
      return;
    }

    saveMutation.mutate();
  };

  const records = recordsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Health records
          </h1>
          <p className="text-sm text-muted-foreground">
            Illness, treatment and mortality events for {activeBusiness?.name}
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={flocks.length === 0}
        >
          <Plus /> Add record
        </Button>
      </div>

      {flocks.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Create a flock first (Flocks page) to record health events.
            </p>
          </CardContent>
        </Card>
      )}

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
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsQuery.isLoading ? (
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
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HeartPulse className="size-4" />
                      No health events recorded.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.eventDate).toLocaleDateString("en-NG")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flockById.get(record.flockId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {EVENT_LABELS[record.eventType]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[record.status]}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.diagnosis ?? record.treatment ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(record)}
                      >
                        Edit
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
            <DialogTitle>
              {editing ? "Edit health record" : "Add health record"}
            </DialogTitle>
            <DialogDescription>
              Track observations, illness, treatments and mortality.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="health-date">Event date</Label>
                <Input
                  id="health-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(event) =>
                    setForm({ ...form, eventDate: event.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Event type</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      eventType: value as FormState["eventType"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OBSERVATION">Observation</SelectItem>
                    <SelectItem value="ILLNESS">Illness</SelectItem>
                    <SelectItem value="TREATMENT">Treatment</SelectItem>
                    <SelectItem value="VACCINATION">Vaccination</SelectItem>
                    <SelectItem value="RECOVERY">Recovery</SelectItem>
                    <SelectItem value="MORTALITY">Mortality</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="TREATED">Treated</SelectItem>
                    <SelectItem value="RECOVERED">Recovered</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="health-symptoms">Symptoms</Label>
              <Input
                id="health-symptoms"
                value={form.symptoms}
                onChange={(event) =>
                  setForm({ ...form, symptoms: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health-diagnosis">Diagnosis</Label>
              <Input
                id="health-diagnosis"
                value={form.diagnosis}
                onChange={(event) =>
                  setForm({ ...form, diagnosis: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health-treatment">Treatment</Label>
              <Input
                id="health-treatment"
                value={form.treatment}
                onChange={(event) =>
                  setForm({ ...form, treatment: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health-notes">Notes</Label>
              <Input
                id="health-notes"
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
                    : "Add record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

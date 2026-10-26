import { useState, type ReactNode } from "react";import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listAdminPlans,
  updateAdminPlan,
  type AdminPlanRow,
} from "@/api/admin";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AdminPlansPage(): ReactNode {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<AdminPlanRow | null>(null);

  const plansQuery = useQuery({
    queryKey: ["admin-plans"],
    queryFn: listAdminPlans,
  });

  const updateMutation = useMutation({
    mutationFn: async (plan: AdminPlanRow) => {
      return updateAdminPlan(plan.code, {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        limits: plan.limits,
        features: plan.features,
        isActive: plan.isActive,
      });
    },
    onSuccess: () => {
      toast.success("Plan updated");
      setEditPlan(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Update failed");
    },
  });

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Pricing and limits shown to every farm. Changes apply immediately.
        </p>
      </div>

      {plansQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.code} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {plan.code}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-lg font-semibold">
                  NGN {plan.monthlyPrice.toLocaleString("en-NG")} / month
                </div>
                <div className="text-xs text-muted-foreground">
                  Yearly: NGN {plan.annualPrice.toLocaleString("en-NG")}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPlan(plan)}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editPlan)}
        onOpenChange={(open) => {
          if (!open) setEditPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editPlan?.name} ({editPlan?.code})
            </DialogTitle>
          </DialogHeader>
          {editPlan ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editPlan.name}
                  onChange={(event) =>
                    setEditPlan({ ...editPlan, name: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly price</Label>
                  <Input
                    type="number"
                    value={editPlan.monthlyPrice}
                    onChange={(event) =>
                      setEditPlan({
                        ...editPlan,
                        monthlyPrice: Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual price</Label>
                  <Input
                    type="number"
                    value={editPlan.annualPrice}
                    onChange={(event) =>
                      setEditPlan({
                        ...editPlan,
                        annualPrice: Number(event.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Users limit (-1 = unlimited)</Label>
                <Input
                  type="number"
                  value={editPlan.limits.users}
                  onChange={(event) =>
                    setEditPlan({
                      ...editPlan,
                      limits: {
                        ...editPlan.limits,
                        users: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Products limit</Label>
                <Input
                  type="number"
                  value={editPlan.limits.products}
                  onChange={(event) =>
                    setEditPlan({
                      ...editPlan,
                      limits: {
                        ...editPlan.limits,
                        products: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Locations limit</Label>
                <Input
                  type="number"
                  value={editPlan.limits.locations}
                  onChange={(event) =>
                    setEditPlan({
                      ...editPlan,
                      limits: {
                        ...editPlan.limits,
                        locations: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => editPlan && updateMutation.mutate(editPlan)}
            >
              {updateMutation.isPending ? "Saving..." : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CreditCard, XCircle } from "lucide-react";
import {
  listPlans,
  getSubscription,
  cancelSubscription,
  initCheckout,
  type Plan,
} from "@/api/billing";
import { useBusinesses } from "@/context/BusinessContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
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

const formatNaira = (value: number): string =>
  `₦${value.toLocaleString("en-NG")}`;

type Interval = "MONTHLY" | "YEARLY";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "Free trial", variant: "default" },
  ACTIVE: { label: "Active", variant: "default" },
  PAST_DUE: { label: "Past due", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "outline" },
};

export function BillingPage(): ReactNode {
  const { activeBusiness } = useBusinesses();
  const { user } = useAuth();
  const businessId = activeBusiness?.id;
  const queryClient = useQueryClient();

  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const plansQuery = useQuery({
    queryKey: ["plans", businessId],
    queryFn: () => listPlans(businessId as string),
    enabled: Boolean(businessId),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", businessId],
    queryFn: () => getSubscription(businessId as string),
    enabled: Boolean(businessId),
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      return initCheckout(businessId as string, {
        interval,
        planCode: plan.code === "FREE" ? undefined : plan.code,
        email: user?.email,
      });
    },
    onSuccess: async (result) => {
      toast.success("Redirecting to Paystack checkout...");
      await queryClient.invalidateQueries({
        queryKey: ["subscription", businessId],
      });
      window.location.href = result.authorizationUrl;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Checkout failed"
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => cancelSubscription(businessId as string),
    onSuccess: () => {
      toast.success("Subscription cancelled at period end");
      void queryClient.invalidateQueries({
        queryKey: ["subscription", businessId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel"
      );
    },
  });

  const plans: Plan[] = plansQuery.data ?? [];
  const currentPlanCode =
    subscriptionQuery.data?.subscription?.planCode;
  const effectiveStatus =
    subscriptionQuery.data?.effectiveStatus ?? "TRIALING";
  const statusMeta = STATUS_LABELS[effectiveStatus];

  const handleChoosePlan = (plan: Plan) => {
    if (plan.code === "FREE") {
      toast.info("Switching to free happens when your paid plan ends.");
      return;
    }

    setCheckoutPlan(plan);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage how {activeBusiness?.name} pays for Poultra
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setInterval(interval === "MONTHLY" ? "YEARLY" : "MONTHLY")
          }
        >
          {interval === "MONTHLY" ? "Show yearly prices" : "Show monthly prices"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold">
                {currentPlanCode ?? "FREE"}
              </span>
              {statusMeta && (
                <Badge variant={statusMeta.variant}>
                  {statusMeta.label}
                </Badge>
              )}
              {subscriptionQuery.data?.subscription?.trialEndsAt &&
                effectiveStatus === "TRIALING" && (
                  <span className="text-sm text-muted-foreground">
                    Trial ends{" "}
                    {new Date(
                      subscriptionQuery.data.subscription.trialEndsAt
                    ).toLocaleDateString("en-NG")}
                  </span>
                )}
              {subscriptionQuery.data?.subscription?.periodEnd &&
                effectiveStatus === "ACTIVE" && (
                  <span className="text-sm text-muted-foreground">
                    Renews{" "}
                    {new Date(
                      subscriptionQuery.data.subscription.periodEnd
                    ).toLocaleDateString("en-NG")}
                  </span>
                )}
              <div className="ml-auto flex gap-2">
                {!currentPlanCode ||
                (currentPlanCode === "FREE" &&
                  subscriptionQuery.data?.effectiveStatus === "FREE") ? null : (
                  <Button
                    size="sm"
                    onClick={() => {
                      const current =
                        plans.find((p) => p.code === currentPlanCode);
                      if (current && current.code !== "FREE") {
                        setCheckoutPlan(current);
                      }
                    }}
                  >
                    <CreditCard /> Pay for current plan
                  </Button>
                )}
                {!subscriptionQuery.data?.subscription?.cancelAtPeriodEnd &&
                  (currentPlanCode ?? "FREE") !== "FREE" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle /> Cancel
                    </Button>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plansQuery.isLoading ? (
          [1, 2, 3].map((n) => (
            <Card key={n}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          plans
            .filter((plan) => plan.isActive)
            .map((plan) => {
            const price =
              interval === "YEARLY" ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = plan.code === currentPlanCode;

            return (
              <Card
                key={plan.code}
                className={cn(
                  isCurrent && "border-primary ring-1 ring-primary"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-semibold">
                      {formatNaira(price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{interval === "YEARLY" ? "year" : "month"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 size-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    disabled={isCurrent || plan.code === "FREE"}
                    onClick={() => handleChoosePlan(plan)}
                  >
                    {isCurrent
                      ? "Your plan"
                      : plan.code === "FREE"
                        ? "Default tier"
                        : `Switch to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={Boolean(checkoutPlan)}
        onOpenChange={(open) => {
          if (!open) setCheckoutPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Checkout {checkoutPlan?.name} plan
            </DialogTitle>
            <DialogDescription>
              Pay securely through Paystack.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Billing interval</Label>
              <Select
                value={interval}
                onValueChange={(value) =>
                  setInterval(value as Interval)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">
                    Monthly — {formatNaira(checkoutPlan?.monthlyPrice ?? 0)}
                  </SelectItem>
                  <SelectItem value="YEARLY">
                    Yearly — {formatNaira(checkoutPlan?.annualPrice ?? 0)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be redirected to Paystack to complete payment. Your
              plan activates as soon as the payment confirms.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutPlan(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                checkoutPlan && checkoutMutation.mutate(checkoutPlan)
              }
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending
                ? "Starting..."
                : "Continue to Paystack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

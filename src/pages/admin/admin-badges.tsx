import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

const BADGE_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  TRIALING: "secondary",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "outline",
};

export function StatusBadge(props: { status: string }): ReactNode {
  const label = BADGE_LABELS[props.status] ?? props.status;
  const variant = BADGE_VARIANTS[props.status] ?? "outline";

  return <Badge variant={variant}>{label}</Badge>;
}

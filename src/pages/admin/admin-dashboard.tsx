import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview, getAdminRevenue } from "@/api/admin";
import {
  formatNaira,
  AdminSectionCard,
} from "./admin-shared";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboardPage(): ReactNode {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
  });

  const revenue = useQuery({
    queryKey: ["admin-revenue", 6],
    queryFn: () => getAdminRevenue(6),
  });

  const data = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Health of the whole Poultra platform
        </p>
      </div>

      {overview.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-28 w-full" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <AdminSectionCard title="Businesses">
            <span className="text-3xl font-semibold">
              {data.businesses.total}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.businesses.trial} trial - {data.businesses.active} paid -{" "}
              {data.businesses.suspended} suspended
            </p>
          </AdminSectionCard>
          <AdminSectionCard title="Paid subscriptions">
            <span className="text-3xl font-semibold">
              {data.subscriptions.active}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.subscriptions.trialing} still trialing
            </p>
          </AdminSectionCard>
          <AdminSectionCard title="Revenue this month">
            <span className="text-3xl font-semibold">
              {formatNaira(data.revenue.thisMonth)}
            </span>
          </AdminSectionCard>
          <AdminSectionCard title="Revenue all time">
            <span className="text-3xl font-semibold">
              {formatNaira(data.revenue.allTime)}
            </span>
          </AdminSectionCard>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">
          Revenue by month (last 6 months)
        </h3>
        {revenue.isLoading ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : (revenue.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {(revenue.data ?? []).map((point) => (
              <div
                key={point.month}
                className="flex items-center justify-between text-sm"
              >
                <span>{point.month}</span>
                <span className="font-medium">{formatNaira(point.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

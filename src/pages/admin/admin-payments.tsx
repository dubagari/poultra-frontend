import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listAdminPayments,
  getAdminRevenue,
} from "@/api/admin";
import { formatNaira, formatDate } from "./admin-shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminPaymentsPage(): ReactNode {
  const payments = useQuery({
    queryKey: ["admin-payments", 1, 20],
    queryFn: () => listAdminPayments({ page: 1, limit: 20 }),
  });

  const revenue = useQuery({
    queryKey: ["admin-revenue", 12],
    queryFn: () => getAdminRevenue(12),
  });

  const rows = payments.data?.items ?? [];
  const points = revenue.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payments and revenue
        </h1>
        <p className="text-sm text-muted-foreground">
          All Paystack transactions on the platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {points.slice(-3).map((point) => (
          <div
            key={point.month}
            className="rounded-lg border bg-card p-5"
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {point.month}
            </h3>
            <span className="mt-2 block text-2xl font-semibold">
              {formatNaira(point.total)}
            </span>
          </div>
        ))}
        {points.length === 0 && !revenue.isLoading ? (
          <div className="col-span-3 rounded-lg border bg-card p-5 text-sm text-muted-foreground">
            No revenue recorded yet.
          </div>
        ) : null}
      </div>

      {revenue.isLoading || payments.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No payments yet. They will appear here after the first
                    checkout.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.business.name}
                    </TableCell>
                    <TableCell>{payment.planCode}</TableCell>
                    <TableCell>
                      {payment.interval === "YEARLY" ? "Yearly" : "Monthly"}
                    </TableCell>
                    <TableCell>{formatNaira(payment.amount)}</TableCell>
                    <TableCell>
                      {payment.status === "SUCCESS" ? "Success" : payment.status}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.reference ?? "-"}
                    </TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

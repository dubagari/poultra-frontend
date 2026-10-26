import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listAdminBusinesses,
  setBusinessStatus,
  type AdminBusinessRow,
} from "@/api/admin";
import { StatusBadge } from "./admin-badges";
import { formatDate } from "./admin-shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Input,
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminBusinessesPage(): ReactNode {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-businesses", search, page],
    queryFn: () => listAdminBusinesses({ search, page, limit: 20 }),
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      businessId: string;
      status: "ACTIVE" | "SUSPENDED";
    }) => setBusinessStatus(input.businessId, input.status),
    onSuccess: (_result, input) => {
      toast.success(
        input.status === "SUSPENDED"
          ? "Business suspended"
          : "Business restored"
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin-businesses"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-overview"],
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Action failed");
    },
  });

  const businesses: AdminBusinessRow[] = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            Every farm on the platform {pagination ? `(${pagination.total})` : ""}
          </p>
        </div>
        <Input
          placeholder="Search farm or owner..."
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="max-w-xs"
        />
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farm</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Sub status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No businesses found
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">
                      {business.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{business.owner.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {business.owner.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={business.status} />
                    </TableCell>
                    <TableCell>
                      {business.subscription?.planCode ?? "-"}
                    </TableCell>
                    <TableCell>
                      {business.subscription ? (
                        <StatusBadge
                          status={business.subscription.effectiveStatus}
                        />
                      ) : (
                        "-" 
                      )}
                    </TableCell>
                    <TableCell>{formatDate(business.createdAt)}</TableCell>
                    <TableCell>
                      {business.status === "SUSPENDED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              businessId: business.id,
                              status: "ACTIVE",
                            })
                          }
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              businessId: business.id,
                              status: "SUSPENDED",
                            })
                          }
                        >
                          Suspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > pagination.limit ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of{" "}
            {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                page >= Math.ceil(pagination.total / pagination.limit)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

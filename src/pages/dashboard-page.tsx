import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ShoppingCart,
  Bird,
  Skull,
  Egg,
} from "lucide-react";
import { api, type ApiEnvelope } from "@/lib/api";
import { useBusinesses } from "@/context/BusinessContext";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesReport {
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
  deliveredRevenue: number;
  totalItemsSold: number;
  dailyBreakdown: { date: string; orderCount: number; revenue: number }[];
  topProducts: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }[];
}

interface FarmReport {
  eggs: {
    goodEggs: number;
    brokenEggs: number;
    totalEggs: number;
    recordCount: number;
  };
  mortality: {
    total: number;
    byFlock: { flockId: string; birdsLost: number }[];
  };
  populationEvents: number;
  healthRecords: number;
}

interface FinanceSummary {
  income: number;
  expense: number;
  net: number;
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}

export function DashboardPage() {
  const { activeBusiness } = useBusinesses();
  const { user } = useAuth();
  const businessId = activeBusiness?.id;

  const sales = useQuery({
    queryKey: ["dashboard", "sales", businessId],
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<SalesReport>>(
        `/reports/business/${businessId}/sales`
      );
      return response.data.data as SalesReport;
    },
    enabled: Boolean(businessId),
  });

  const farm = useQuery({
    queryKey: ["dashboard", "farm", businessId],
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<FarmReport>>(
        `/reports/business/${businessId}/farm`
      );
      return response.data.data as FarmReport;
    },
    enabled: Boolean(businessId),
  });

  const finance = useQuery({
    queryKey: ["dashboard", "finance", businessId],
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<FinanceSummary>>(
        `/finance/summary?businessId=${businessId}`
      );
      return response.data.data as FinanceSummary;
    },
    enabled: Boolean(businessId),
  });

  const loading = sales.isLoading || farm.isLoading || finance.isLoading;

  const stats = [
    {
      title: "Total revenue",
      value: loading ? null : formatNaira(sales.data?.totalRevenue ?? 0),
      icon: ShoppingCart,
      hint: `${sales.data?.orderCount ?? 0} orders all time`,
    },
    {
      title: "Delivered revenue",
      value: loading
        ? null
        : formatNaira(sales.data?.deliveredRevenue ?? 0),
      icon: ShoppingCart,
      hint: `${sales.data?.deliveredCount ?? 0} delivered orders`,
    },
    {
      title: "Net cash flow",
      value: loading
        ? null
        : formatNaira(finance.data?.net ?? 0),
      icon: Wallet,
      hint: `Income ${formatNaira(finance.data?.income ?? 0)} / Expense ${formatNaira(finance.data?.expense ?? 0)}`,
    },
    {
      title: "Eggs collected",
      value: loading
        ? null
        : (farm.data?.eggs.totalEggs ?? 0).toLocaleString(),
      icon: Egg,
      hint: `${farm.data?.eggs.brokenEggs ?? 0} broken`,
    },
    {
      title: "Mortality",
      value: loading ? null : (farm.data?.mortality.total ?? 0).toString(),
      icon: Skull,
      hint: `${farm.data?.populationEvents ?? 0} population events`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeBusiness
            ? `This is how ${activeBusiness.name} is doing.`
            : "Select or create a business to get started."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stat.value === null ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-semibold">{stat.value}</div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top products</CardTitle>
          <Badge variant="outline" className="w-fit">
            All time
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : (sales.data?.topProducts?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No sales recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                sales.data?.topProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.quantitySold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNaira(product.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mortality by flock</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flock</TableHead>
                <TableHead className="text-right">Birds lost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : (farm.data?.mortality.byFlock?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Bird className="size-4" />
                      No mortality recorded. Great going!
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                farm.data?.mortality.byFlock.map((flock) => (
                  <TableRow key={flock.flockId}>
                    <TableCell className="font-mono text-xs">
                      {flock.flockId}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {flock.birdsLost}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardPage;

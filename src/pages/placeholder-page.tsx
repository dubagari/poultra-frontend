import { type ReactNode } from "react";
import {
  Users,
  ShoppingCart,
  Truck,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  Bird,
  Egg,
  HeartPulse,
  Pill,
  FlaskConical,
  Wallet,
  MapPin,
  Home,
  CreditCard,
} from "lucide-react";
import { useBusinesses } from "@/context/BusinessContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MODULE_LABELS: Record<string, string> = {
  "/finance/ledger": "Finance ledger",
};

export function PlaceholderPage({ route }: { route: string }): ReactNode {
  const { activeBusiness } = useBusinesses();
  const title = MODULE_LABELS[route] ?? "Coming soon";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {MODULE_LABELS[route] === "Billing" ? (
              <CreditCard className="size-4" />
            ) : MODULE_LABELS[route] === "Customers" ? (
              <Users className="size-4" />
            ) : MODULE_LABELS[route] === "Orders" ? (
              <ShoppingCart className="size-4" />
            ) : MODULE_LABELS[route] === "Deliveries" ? (
              <Truck className="size-4" />
            ) : MODULE_LABELS[route] === "Flocks" ? (
              <Bird className="size-4" />
            ) : MODULE_LABELS[route] === "Egg production" ? (
              <Egg className="size-4" />
            ) : MODULE_LABELS[route] === "Health records" ? (
              <HeartPulse className="size-4" />
            ) : MODULE_LABELS[route] === "Medications" ? (
              <Pill className="size-4" />
            ) : MODULE_LABELS[route] === "Feed formulations" ? (
              <FlaskConical className="size-4" />
            ) : MODULE_LABELS[route] === "Products" ? (
              <Boxes className="size-4" />
            ) : MODULE_LABELS[route] === "Inventory" ? (
              <Warehouse className="size-4" />
            ) : MODULE_LABELS[route] === "Stock transfers" ? (
              <ArrowLeftRight className="size-4" />
            ) : MODULE_LABELS[route] === "Finance ledger" ? (
              <Wallet className="size-4" />
            ) : MODULE_LABELS[route] === "Locations" ? (
              <MapPin className="size-4" />
            ) : MODULE_LABELS[route] === "Houses" ? (
              <Home className="size-4" />
            ) : (
              <CreditCard className="size-4" />
            )}
            {activeBusiness ? `${title} for ${activeBusiness.name}` : title}
          </CardTitle>
          <CardDescription>
            This module is wired up but its detailed UI is on the way.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Manage {title.toLowerCase()}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

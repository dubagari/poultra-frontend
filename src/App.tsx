import { Link, Navigate, Outlet, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderPage } from "@/pages/placeholder-page";
import DashboardPage from "@/pages/dashboard-page";
import { CustomersPage } from "@/pages/sales/customers-page";
import { OrdersPage } from "@/pages/sales/orders-page";
import { DeliveriesPage } from "@/pages/sales/deliveries-page";
import { LocationsPage } from "@/pages/inventory/locations-page";
import { HousesPage } from "@/pages/inventory/houses-page";
import { InventoryPage } from "@/pages/inventory/inventory-page";
import { TransfersPage } from "@/pages/inventory/transfers-page";
import { ProductsPage } from "@/pages/inventory/products-page";
import { FlockPage } from "@/pages/farm/flock-page";
import { EggProductionPage } from "@/pages/farm/egg-production-page";
import { HealthPage } from "@/pages/farm/health-page";
import { MedicationsPage } from "@/pages/farm/medications-page";
import { FeedPage } from "@/pages/farm/feed-page";
import { BillingPage } from "@/pages/billing-page";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/auth/login-page";
import { RegisterPage } from "@/pages/auth/register-page";
import { AdminDashboardPage } from "@/pages/admin/admin-dashboard";
import { AdminBusinessesPage } from "@/pages/admin/admin-businesses";
import { AdminPaymentsPage } from "@/pages/admin/admin-payments";
import { AdminPlansPage } from "@/pages/admin/admin-plans";

const ADMIN_ROUTES: { path: string; element: ReactNode }[] = [
  { path: "/admin", element: <AdminDashboardPage /> },
  { path: "/admin/businesses", element: <AdminBusinessesPage /> },
  { path: "/admin/payments", element: <AdminPaymentsPage /> },
  { path: "/admin/plans", element: <AdminPlansPage /> },
];

const PLACEHOLDER_ROUTES: string[] = ["/finance/ledger"];

const REAL_ROUTES: { path: string; element: ReactNode }[] = [
  { path: "/sales/customers", element: <CustomersPage /> },
  { path: "/sales/orders", element: <OrdersPage /> },
  { path: "/sales/deliveries", element: <DeliveriesPage /> },
  { path: "/inventory/stock", element: <InventoryPage /> },
  { path: "/inventory/locations", element: <LocationsPage /> },
  { path: "/inventory/houses", element: <HousesPage /> },
  { path: "/inventory/transfers", element: <TransfersPage /> },
  { path: "/inventory/products", element: <ProductsPage /> },
  { path: "/farm/flocks", element: <FlockPage /> },
  { path: "/farm/eggs", element: <EggProductionPage /> },
  { path: "/farm/health", element: <HealthPage /> },
  { path: "/farm/medications", element: <MedicationsPage /> },
  { path: "/farm/feed", element: <FeedPage /> },
  { path: "/billing", element: <BillingPage /> },
];

function FullPageSpinner(): ReactNode {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedLayout(): ReactNode {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // AppShell renders <Outlet /> where child routes mount.
  return <AppShell />;
}

function AdminGuard(): ReactNode {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <AdminNav />;
}

function AdminNav(): ReactNode {
  const { user } = useAuth();

  const links: { to: string; label: string }[] = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/businesses", label: "Businesses" },
    { to: "/admin/payments", label: "Payments" },
    { to: "/admin/plans", label: "Plans" },
  ];

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-destructive/5">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-semibold">Poultra Admin</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-muted-foreground">
            {user?.email} - logged in as platform admin
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function RootRedirect(): ReactNode {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return <Navigate to={user ? "/" : "/login"} replace />;
}

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        {REAL_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        {PLACEHOLDER_ROUTES.map((route) => (
          <Route
            key={route}
            path={route}
            element={<PlaceholderPage route={route} />}
          />
        ))}
      </Route>
      <Route element={<AdminGuard />}>
        {ADMIN_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

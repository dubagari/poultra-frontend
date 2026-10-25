import { Navigate, Route, Routes } from "react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderPage } from "@/pages/placeholder-page";
import DashboardPage from "@/pages/dashboard-page";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/auth/login-page";
import { RegisterPage } from "@/pages/auth/register-page";

const PLACEHOLDER_ROUTES: string[] = [
  "/sales/customers",
  "/sales/orders",
  "/sales/deliveries",
  "/farm/flocks",
  "/farm/eggs",
  "/farm/health",
  "/farm/medications",
  "/farm/feed",
  "/inventory/products",
  "/inventory/stock",
  "/inventory/transfers",
  "/inventory/locations",
  "/inventory/houses",
  "/finance/ledger",
  "/billing",
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
        {PLACEHOLDER_ROUTES.map((route) => (
          <Route
            key={route}
            path={route}
            element={<PlaceholderPage route={route} />}
          />
        ))}
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

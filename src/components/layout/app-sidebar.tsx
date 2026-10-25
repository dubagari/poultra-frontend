import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
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
  Wallet,
  CreditCard,
  MapPin,
  Home,
  FlaskConical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Billing", url: "/billing", icon: CreditCard },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", url: "/sales/customers", icon: Users },
      { title: "Orders", url: "/sales/orders", icon: ShoppingCart },
      { title: "Deliveries", url: "/sales/deliveries", icon: Truck },
    ],
  },
  {
    label: "Farm",
    items: [
      { title: "Flocks", url: "/farm/flocks", icon: Bird },
      { title: "Egg Production", url: "/farm/eggs", icon: Egg },
      { title: "Health", url: "/farm/health", icon: HeartPulse },
      { title: "Medications", url: "/farm/medications", icon: Pill },
      { title: "Feed", url: "/farm/feed", icon: FlaskConical },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Products", url: "/inventory/products", icon: Boxes },
      { title: "Inventory", url: "/inventory/stock", icon: Warehouse },
      { title: "Transfers", url: "/inventory/transfers", icon: ArrowLeftRight },
      { title: "Locations", url: "/inventory/locations", icon: MapPin },
      { title: "Houses", url: "/inventory/houses", icon: Home },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Ledger", url: "/finance/ledger", icon: Wallet },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            P
          </div>
          <span className="font-semibold text-base group-data-[collapsible=icon]:hidden">
            Poultra
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(active && "font-medium")}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

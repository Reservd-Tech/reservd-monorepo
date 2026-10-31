import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  History,
  Package,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Users,
  UserCog,
  FileText,
  Sparkles,
  Store,
  UtensilsCrossed,
  ClipboardCheck,
  Shield,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useIsPlatformAdmin } from "@/lib/compliance/queries";


const overview = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Onboarding", url: "/onboarding", icon: ClipboardCheck },
];

const operate = [
  { title: "Orders", url: "/orders", icon: ShoppingBag },
  { title: "Menu", url: "/menu", icon: UtensilsCrossed },
  { title: "Order history", url: "/history", icon: History },
  { title: "Shop profile", url: "/shop", icon: Store },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Hygiene", url: "/hygiene", icon: ShieldCheck },
];

const grow = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Staff", url: "/staff", icon: UserCog },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "AI", url: "/ai", icon: Sparkles },
];

const platform = [{ title: "Platform admin", url: "/admin", icon: Shield }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { data: isAdmin } = useIsPlatformAdmin();


  const isActive = (path: string) => currentPath === path;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const renderGroup = (label: string, items: typeof operate) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-7 w-7 shrink-0 rounded-lg gradient-heat" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">QSSF OS</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Vendor platform
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Overview", overview)}
        {renderGroup("Operate", operate)}
        {renderGroup("Grow", grow)}
        {isAdmin ? renderGroup("Platform", platform) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

import {
  LayoutDashboard,
  LogOut,
  PlusCircle,
  History,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brand } from "./Brand";

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

// The admin console's navigation. Add a route here and a page at
// pages/<name>/+Page.tsx to grow the app. The whole shell is admin-only;
// regular members get the standalone /profile page instead.
const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { key: "add", label: "Add Bet", icon: PlusCircle, href: "/add" },
  { key: "history", label: "Bet History", icon: History, href: "/history" },
  { key: "odds", label: "Live Odds", icon: TrendingUp, href: "/odds" },
  { key: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

interface AppSidebarProps {
  active?: string;
  user?: { name?: string | null; email: string };
  onSignOut?: () => void;
}

export function AppSidebar({ active, user, onSignOut }: AppSidebarProps) {
  const initial = (
    user?.name?.trim()?.[0] ||
    user?.email?.[0] ||
    "?"
  ).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <a
          href="/"
          className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:px-0"
        >
          <Brand />
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.key === active}
                    tooltip={item.label}
                  >
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium text-foreground">
              {user?.name || user?.email || "Account"}
            </span>
            {user?.email ? (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
        </div>
        {onSignOut ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onSignOut} tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}

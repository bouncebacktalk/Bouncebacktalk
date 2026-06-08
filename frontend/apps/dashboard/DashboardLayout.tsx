import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  title?: string;
  active?: string;
  user?: { name?: string | null; email: string };
  onSignOut?: () => void;
  children: ReactNode;
}

/**
 * Admin console shell, built on shadcn's Sidebar: a collapsible sidebar on
 * desktop and an off-canvas drawer on mobile, both opened by the same trigger
 * in the top bar. Driven by AdminShell, which gates access and supplies the user.
 */
export function DashboardLayout({
  title = "Dashboard",
  active = "dashboard",
  user,
  onSignOut,
  children,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar active={active} user={user} onSignOut={onSignOut} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-5"
          />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <ThemeToggle className="ml-auto" />
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

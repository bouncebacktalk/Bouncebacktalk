import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  active?: string;
  user?: { name?: string | null; email: string };
  onSignOut?: () => void;
  children: ReactNode;
  /** Hide bottom nav (e.g. on scan/add screen for immersive feel) */
  hideNav?: boolean;
}

export function AppLayout({ active, user, onSignOut, children, hideNav }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col max-w-lg mx-auto relative">
      {/* Scrollable content area */}
      <main className={`flex-1 overflow-y-auto ${hideNav ? "pb-0" : "pb-24"}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && (
        <BottomNav active={active} onSignOut={onSignOut} />
      )}

      <Toaster />
    </div>
  );
}

import { LayoutDashboard, History, Camera, TrendingUp, User } from "lucide-react";

const TABS = [
  { key: "dashboard", label: "Home",   icon: LayoutDashboard, href: "/dashboard" },
  { key: "history",   label: "Bets",   icon: History,         href: "/history"   },
  { key: "add",       label: "",        icon: Camera,          href: "/add",  isScan: true },
  { key: "odds",      label: "Odds",   icon: TrendingUp,       href: "/odds"      },
  { key: "profile",   label: "Profile", icon: User,            href: "/settings"  },
];

interface BottomNavProps {
  active?: string;
  onSignOut?: () => void;
}

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
      {/* frosted glass bar */}
      <div className="bg-[#161616]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pb-safe-area-inset-bottom">
        <div className="flex items-end justify-around h-16">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            if (tab.isScan) {
              return (
                <a
                  key={tab.key}
                  href={tab.href}
                  className="relative -top-5 flex flex-col items-center"
                >
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-lg
                    transition-transform active:scale-95
                    ${isActive
                      ? "bg-[#E21111] shadow-[#E21111]/40"
                      : "bg-[#E21111] shadow-[#E21111]/30"
                    }
                  `}
                  style={{ boxShadow: "0 4px 24px rgba(226,17,17,0.45)" }}
                  >
                    <tab.icon className="size-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] text-[#8E8E93] mt-0.5 font-medium">Scan</span>
                </a>
              );
            }
            return (
              <a
                key={tab.key}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 transition-colors"
              >
                <tab.icon
                  className={`size-6 transition-colors ${
                    isActive ? "text-[#E21111]" : "text-[#8E8E93]"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-[#E21111]" : "text-[#8E8E93]"
                  }`}
                >
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

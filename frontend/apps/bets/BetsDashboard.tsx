import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, ChevronRight, Zap } from "lucide-react";
import { apiGet } from "../api/api";
import { formatMoney, statusBg, type StatsResponse, type BetStats, type Bet } from "./bets";

type Period = "today" | "week" | "month" | "year" | "allTime";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today",   label: "Today"   },
  { key: "week",    label: "Week"    },
  { key: "month",   label: "Month"   },
  { key: "year",    label: "Year"    },
  { key: "allTime", label: "All Time" },
];

const SPORTSBOOK_COLORS: Record<string, string> = {
  DraftKings: "#53D338",
  FanDuel:    "#1493FF",
  BetMGM:     "#C9A84C",
  Caesars:    "#0A2240",
  "ESPN Bet": "#FF6600",
};

function sbColor(sb?: string): string {
  if (!sb) return "#8E8E93";
  return SPORTSBOOK_COLORS[sb] ?? "#8E8E93";
}

function ProfitCard({ s, period }: { s: BetStats; period: Period }) {
  const isUp = s.profit > 0;
  const isFlat = s.profit === 0 || s.bets === 0;
  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 ${
      isFlat
        ? "bg-[#1A1A1A]"
        : isUp
        ? "bg-gradient-to-br from-[#0D2B1A] to-[#0F2016]"
        : "bg-gradient-to-br from-[#2B0D0D] to-[#200F0F]"
    }`}
    style={{ border: `1px solid ${isFlat ? "rgba(255,255,255,0.06)" : isUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}
    >
      {/* Decorative circle */}
      <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 ${
        isFlat ? "bg-white" : isUp ? "bg-green-400" : "bg-red-400"
      }`} />

      <div className="relative">
        <p className="text-[#8E8E93] text-sm font-medium mb-1">
          {PERIODS.find(p => p.key === period)?.label} P/L
        </p>
        <p className={`text-5xl font-black tracking-tight mb-4 ${
          isFlat ? "text-white" : isUp ? "text-green-400" : "text-red-400"
        }`}>
          {formatMoney(s.profit)}
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isUp ? (
              <TrendingUp className="size-4 text-green-400" />
            ) : (
              <TrendingDown className="size-4 text-red-400" />
            )}
            <span className="text-sm text-[#8E8E93]">
              {s.bets > 0 ? `${s.winPct.toFixed(0)}% win rate` : "No bets"}
            </span>
          </div>
          {s.bets > 0 && (
            <div className="h-4 w-px bg-white/10" />
          )}
          {s.bets > 0 && (
            <span className="text-sm text-[#8E8E93]">
              {s.won}W – {s.lost}L
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 border border-white/[0.06]">
      <p className="text-[11px] text-[#8E8E93] font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function BetRow({ bet }: { bet: Bet }) {
  const label =
    bet.type === "PARLAY"
      ? `${bet.legs.length}-Leg Parlay`
      : bet.legs[0]?.pick || "Straight Bet";
  const profit = Number(bet.profit ?? 0);
  const isWon = bet.status === "WON";
  const isLost = bet.status === "LOST";
  const isPending = bet.status === "PENDING";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
        isWon ? "bg-green-400" : isLost ? "bg-red-400" : isPending ? "bg-amber-400" : "bg-[#8E8E93]"
      }`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {bet.sportsbook && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: sbColor(bet.sportsbook) }}
            >
              {bet.sportsbook}
            </span>
          )}
          <span className="text-[10px] text-[#8E8E93]">
            {new Date(bet.betDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${
          isWon ? "text-green-400" : isLost ? "text-red-400" : "text-[#8E8E93]"
        }`}>
          {isPending ? `$${Number(bet.stake).toFixed(0)}` : formatMoney(profit)}
        </p>
        <p className="text-[10px] text-[#8E8E93]">{isPending ? "at risk" : profit >= 0 ? "profit" : "loss"}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
        <Zap className="size-7 text-[#E21111]" />
      </div>
      <p className="text-white font-semibold text-lg mb-1">Ready to track?</p>
      <p className="text-[#8E8E93] text-sm mb-5">Scan your first bet slip to get started.</p>
      <a
        href="/add"
        className="bg-[#E21111] text-white font-semibold text-sm px-6 py-3 rounded-full active:scale-95 transition-transform"
      >
        Scan Bet Slip
      </a>
    </div>
  );
}

export function BetsDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<StatsResponse>("/api/bets/stats"),
      apiGet<Bet[]>("/api/bets?limit=6&sortBy=createdAt&sortDir=desc"),
    ])
      .then(([s, b]) => { setStats(s); setRecentBets(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = stats?.[period];

  return (
    <div className="px-4 pt-10 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#8E8E93] text-sm">Good {getGreeting()}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
        </div>
        {stats && stats.pending > 0 && (
          <a href="/history?status=PENDING" className="relative">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center">
              <Clock className="size-4 text-amber-400" />
            </div>
            <span className="absolute -top-1 -right-1 bg-[#E21111] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {stats.pending}
            </span>
          </a>
        )}
      </div>

      {/* Period pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              period === p.key
                ? "bg-[#E21111] text-white"
                : "bg-[#1A1A1A] text-[#8E8E93] border border-white/[0.06]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* P/L card */}
      {loading ? (
        <div className="h-40 rounded-3xl bg-[#1A1A1A] animate-pulse border border-white/[0.06]" />
      ) : s ? (
        <ProfitCard s={s} period={period} />
      ) : null}

      {/* Mini stats row */}
      {!loading && s && (
        <div className="flex gap-3">
          <MiniStat
            label="Win %"
            value={s.bets > 0 ? `${s.winPct.toFixed(0)}%` : "—"}
            color={s.winPct >= 55 ? "text-green-400" : s.bets === 0 ? "text-white" : "text-red-400"}
          />
          <MiniStat
            label="ROI"
            value={s.stake > 0 ? `${s.roi.toFixed(1)}%` : "—"}
            color={s.roi >= 0 ? "text-green-400" : "text-red-400"}
          />
          <MiniStat
            label="Wagered"
            value={s.stake > 0 ? `$${s.stake.toFixed(0)}` : "$0"}
          />
        </div>
      )}

      {/* Recent bets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Recent Bets</h2>
          <a href="/history" className="flex items-center gap-0.5 text-[#E21111] text-sm font-medium">
            See all <ChevronRight className="size-4" />
          </a>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl px-4 border border-white/[0.06]">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentBets.length === 0 ? (
            <EmptyState />
          ) : (
            recentBets.map((bet) => <BetRow key={bet.id} bet={bet} />)
          )}
        </div>
      </div>

      {/* Quick scan CTA */}
      {recentBets.length > 0 && (
        <a
          href="/add"
          className="flex items-center justify-center gap-2 w-full bg-[#E21111] text-white font-bold text-base py-4 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 4px 20px rgba(226,17,17,0.35)" }}
        >
          📸 Scan New Bet Slip
        </a>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

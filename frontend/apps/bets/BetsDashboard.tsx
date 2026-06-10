import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Target, Clock, DollarSign, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "../api/api";
import { formatOdds, formatMoney, statusBg, type StatsResponse, type BetStats, type Bet } from "./bets";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  positive,
  neutral,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  positive?: boolean;
  neutral?: boolean;
}) {
  const color = neutral
    ? "text-foreground"
    : positive
    ? "text-green-400"
    : "text-red-400";
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodStats({ s }: { s: BetStats }) {
  const profitPos = s.profit >= 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Profit / Loss"
        value={formatMoney(s.profit)}
        sub={`${s.bets} bets`}
        icon={profitPos ? TrendingUp : TrendingDown}
        positive={s.profit > 0}
        neutral={s.profit === 0}
      />
      <StatCard
        label="Win %"
        value={s.bets > 0 ? `${s.winPct.toFixed(1)}%` : "—"}
        sub={`${s.won}W – ${s.lost}L`}
        icon={Target}
        positive={s.winPct >= 55}
        neutral={s.bets === 0}
      />
      <StatCard
        label="ROI"
        value={s.stake > 0 ? `${s.roi.toFixed(1)}%` : "—"}
        sub={s.stake > 0 ? `$${s.stake.toFixed(0)} wagered` : "No bets"}
        icon={Percent}
        positive={s.roi >= 0}
        neutral={s.stake === 0}
      />
      <StatCard
        label="Total Wagered"
        value={`$${s.stake.toFixed(2)}`}
        sub={`${s.bets} bets`}
        icon={DollarSign}
        neutral
      />
      <StatCard
        label="Total Payout"
        value={s.won > 0 ? `$${(s.stake + s.profit).toFixed(2)}` : "$0.00"}
        sub={`${s.won} wins`}
        icon={TrendingUp}
        neutral
      />
      <StatCard
        label="Pending"
        value={`${s.pending}`}
        sub="open bets"
        icon={Clock}
        neutral
      />
    </div>
  );
}

export function BetsDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "allTime">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<StatsResponse>("/api/bets/stats"),
      apiGet<Bet[]>("/api/bets?limit=5&sortBy=createdAt&sortDir=desc"),
    ])
      .then(([s, b]) => {
        setStats(s);
        setRecentBets(b);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentStats = stats?.[period];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading stats…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your betting performance</p>
        </div>
        <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
          <a href="/add">+ Add Bet</a>
        </Button>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList className="bg-muted">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
          <TabsTrigger value="allTime">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {currentStats ? (
        <PeriodStats s={currentStats} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No data for this period.
        </div>
      )}

      {/* Pending bets alert */}
      {stats && stats.pending > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">
                  {stats.pending} pending bet{stats.pending !== 1 ? "s" : ""} awaiting settlement
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                <a href="/history?status=PENDING">View →</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent bets */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Bets</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <a href="/history">View all →</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentBets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-3">No bets yet.</p>
              <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <a href="/add">Add your first bet</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${statusBg(bet.status)}`}
                    >
                      {bet.status}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {bet.type === "PARLAY"
                          ? `${bet.legs.length}-leg Parlay`
                          : bet.legs[0]?.pick || "Straight Bet"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bet.sportsbook ?? "—"} · {formatOdds(bet.odds)} ·{" "}
                        {new Date(bet.betDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        bet.status === "WON"
                          ? "text-green-400"
                          : bet.status === "LOST"
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {bet.status === "PENDING"
                        ? `$${Number(bet.stake).toFixed(2)}`
                        : formatMoney(Number(bet.profit ?? 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bet.status === "PENDING" ? "wagered" : "profit"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, Trash2, CheckCircle, Activity, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react";
import { useLiveScores, matchLegToScore, computeLegStatus, type LiveScore, type LegStatus } from "./useLiveScores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiGet } from "../api/api";
import { betsApi, formatOdds, formatMoney, statusBg, type Bet, type BetStatus } from "./bets";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Push", value: "PUSH" },
  { label: "Void", value: "VOID" },
];

const TYPE_OPTIONS = [
  { label: "All types", value: "ALL" },
  { label: "Straight", value: "STRAIGHT" },
  { label: "Parlay", value: "PARLAY" },
];

function SettleDialog({
  bet,
  onClose,
  onSettled,
}: {
  bet: Bet;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [status, setStatus] = useState<BetStatus>("WON");
  const [saving, setSaving] = useState(false);

  async function settle() {
    setSaving(true);
    try {
      await betsApi.update(bet.id, { status });
      onSettled();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle Bet</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            {bet.type === "PARLAY"
              ? `${bet.legs.length}-leg Parlay`
              : bet.legs[0]?.pick || "Straight Bet"}{" "}
            · {formatOdds(bet.odds)} · ${Number(bet.stake).toFixed(2)} wagered
          </p>
          <div>
            <Label className="text-xs">Result</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BetStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WON">Won ✓</SelectItem>
                <SelectItem value="LOST">Lost ✗</SelectItem>
                <SelectItem value="PUSH">Push ↔</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={settle}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Supported sports for live tracking ───────────────────────────────────────
const LIVE_SPORTS = new Set(["NBA", "MLB"]);
const COMING_SOON_SPORTS = new Set(["NFL", "NHL", "NCAAF", "NCAAB"]);

function ComingSoonBadge({ sport }: { sport?: string }) {
  if (!sport) return null;
  const upper = sport.toUpperCase();
  if (!COMING_SOON_SPORTS.has(upper)) return null;
  return (
    <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
      {upper} live tracking coming soon
    </span>
  );
}

function ScoreBadge({ score, legStatus }: { score: LiveScore; legStatus?: LegStatus }) {
  if (score.homeScore == null && score.awayScore == null) return null;

  const awayNick = score.awayTeam.split(" ").pop() ?? score.awayTeamCode;
  const homeNick = score.homeTeam.split(" ").pop() ?? score.homeTeamCode;

  // Period label: "Q3 4:32", "OT", "Top 4th", "Final", etc.
  let periodText = "";
  if (score.isFinal) {
    periodText = " · F";
  } else if (score.isLive && score.periodLabel) {
    periodText = ` · ${score.periodLabel}`;
    if (score.timeRemaining) periodText += ` ${score.timeRemaining}`;
  }

  const statusColors: Record<NonNullable<LegStatus>, string> = {
    winning: "bg-green-500/15 text-green-400 border-green-500/30",
    losing:  "bg-red-500/15  text-red-400  border-red-500/30",
    push:    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };

  const baseClass = score.isLive
    ? (legStatus ? statusColors[legStatus] : "bg-green-500/15 text-green-400 border-green-500/30")
    : "bg-muted/60 text-muted-foreground border-border";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${baseClass}`}>
      {score.isLive && (
        <span className={`size-1.5 rounded-full inline-block animate-pulse ${legStatus === "winning" ? "bg-green-400" : legStatus === "losing" ? "bg-red-400" : "bg-green-400"}`} />
      )}
      {awayNick} {score.awayScore} @ {homeNick} {score.homeScore}
      <span className="opacity-60">{periodText}</span>
    </span>
  );
}

function LegStatusIcon({ status }: { status: LegStatus }) {
  if (!status) return null;
  if (status === "winning") return <TrendingUp className="size-3 text-green-400 shrink-0" />;
  if (status === "losing")  return <TrendingDown className="size-3 text-red-400 shrink-0" />;
  return <MinusIcon className="size-3 text-yellow-400 shrink-0" />;
}

function BetRow({ bet, onRefresh, liveScores }: { bet: Bet; onRefresh: () => void; liveScores: LiveScore[] }) {
  const [expanded, setExpanded] = useState(false);
  const [settling, setSettling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteBet() {
    if (!confirm("Delete this bet?")) return;
    setDeleting(true);
    try {
      await betsApi.remove(bet.id);
      onRefresh();
    } catch {
      setDeleting(false);
    }
  }

  const profitDisplay =
    bet.status === "PENDING"
      ? `$${Number(bet.stake).toFixed(2)} wagered`
      : formatMoney(Number(bet.profit ?? 0));

  const profitColor =
    bet.status === "WON"
      ? "text-green-400"
      : bet.status === "LOST"
      ? "text-red-400"
      : "text-muted-foreground";

  return (
    <>
      {settling && (
        <SettleDialog
          bet={bet}
          onClose={() => setSettling(false)}
          onSettled={() => { setSettling(false); onRefresh(); }}
        />
      )}
      <div className="border-b border-border last:border-0">
        <div
          className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded((p) => !p)}
        >
          <Badge variant="outline" className={`shrink-0 text-xs ${statusBg(bet.status)}`}>
            {bet.status}
          </Badge>

          <div className="flex-1 min-w-0">
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

          <div className="text-right shrink-0">
            <p className={`text-sm font-semibold ${profitColor}`}>{profitDisplay}</p>
            <p className="text-xs text-muted-foreground">
              {bet.status === "PENDING" ? "pending" : bet.status === "PUSH" ? "push" : bet.status === "WON" ? "profit" : "loss"}
            </p>
          </div>

          <ChevronDown
            className={`size-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 bg-muted/20">
            {/* Parlay progress bar */}
            {bet.type === "PARLAY" && bet.status === "PENDING" && bet.legs.length > 0 && (() => {
              const won = bet.legs.filter(l => l.result === "WON").length;
              const lost = bet.legs.filter(l => l.result === "LOST").length;
              const total = bet.legs.length;
              if (won + lost === 0) return null;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Activity className="size-3" /> Parlay progress</span>
                    <span>{won}/{total} legs hit{lost > 0 ? ` · ${lost} lost` : ""}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${(won / total) * 100}%` }} />
                    <div className="bg-red-500 h-full transition-all" style={{ width: `${(lost / total) * 100}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Legs */}
            {bet.legs.length > 0 && (
              <div className="space-y-1">
                {bet.legs.map((leg, i) => {
                  const isPending = bet.status === "PENDING";
                  const score = isPending ? matchLegToScore(leg, liveScores) : null;
                  const legStatus = score ? computeLegStatus(leg, score) : null;
                  const isLiveGame = score?.isLive ?? false;
                  const sportUpper = (leg.sport ?? "").toUpperCase();
                  const unsupported = COMING_SOON_SPORTS.has(sportUpper);

                  return (
                    <div
                      key={leg.id}
                      className={`flex flex-col gap-1 text-xs rounded px-2.5 py-2 border transition-colors ${
                        isLiveGame && legStatus === "winning"
                          ? "bg-green-500/5 border-green-500/20"
                          : isLiveGame && legStatus === "losing"
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-muted border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                        <span className="font-medium text-foreground">{leg.pick ?? "—"}</span>
                        {leg.line && <span className="text-muted-foreground">{leg.line}</span>}
                        {leg.sport && (
                          <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                            {leg.sport}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-1.5">
                          {/* Live win/loss icon */}
                          {isLiveGame && isPending && <LegStatusIcon status={legStatus} />}

                          {leg.odds && (
                            <span className="font-mono text-muted-foreground">
                              {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                            </span>
                          )}
                          {leg.result && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${statusBg(leg.result as BetStatus)}`}
                            >
                              {leg.result}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Live score row */}
                      {score && (
                        <div className="pl-6 flex items-center gap-2 flex-wrap">
                          <ScoreBadge score={score} legStatus={legStatus} />
                          {isLiveGame && legStatus && (
                            <span className={`text-[10px] font-semibold ${
                              legStatus === "winning" ? "text-green-400" :
                              legStatus === "losing"  ? "text-red-400"   :
                              "text-yellow-400"
                            }`}>
                              {legStatus === "winning" ? "▲ Winning" :
                               legStatus === "losing"  ? "▼ Losing"  :
                               "= Push"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Coming soon notice for unsupported sports */}
                      {isPending && unsupported && (
                        <div className="pl-6">
                          <ComingSoonBadge sport={leg.sport} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {bet.notes && (
              <p className="text-xs text-muted-foreground italic px-1">{bet.notes}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {bet.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => { e.stopPropagation(); setSettling(true); }}
                  >
                    <CheckCircle className="size-3 mr-1" /> Settle
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-400 hover:text-red-300 ml-auto"
                disabled={deleting}
                onClick={(e) => { e.stopPropagation(); deleteBet(); }}
              >
                <Trash2 className="size-3 mr-1" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function BetHistory() {
  const liveScores = useLiveScores(60_000);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  const fetchBets = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (reset) setPage(1);
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String((p - 1) * PAGE_SIZE),
      };
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (typeFilter !== "ALL") params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const data = await apiGet<Bet[]>(`/api/bets?${new URLSearchParams(params)}`);
      setBets(reset || p === 1 ? data : (prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => { fetchBets(true); }, [statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchBets(true), 350);
    return () => clearTimeout(t);
  }, [search]);

  function loadMore() {
    setPage((p) => p + 1);
  }

  useEffect(() => {
    if (page > 1) fetchBets(false);
  }, [page]);

  const totals = bets.reduce(
    (acc, b) => {
      if (b.status === "WON") acc.profit += Number(b.profit ?? 0);
      if (b.status === "LOST") acc.profit += Number(b.profit ?? 0);
      return acc;
    },
    { profit: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bet History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bets.length} bets loaded</p>
        </div>
        <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
          <a href="/add">+ Add Bet</a>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search picks, sportsbooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[120px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar for filtered view */}
      {bets.length > 0 && (statusFilter !== "ALL" || typeFilter !== "ALL" || search) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span>{bets.filter((b) => b.status === "WON").length} won</span>
          <span>{bets.filter((b) => b.status === "LOST").length} lost</span>
          <span>{bets.filter((b) => b.status === "PENDING").length} pending</span>
          <span
            className={`ml-auto font-semibold ${totals.profit >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {formatMoney(totals.profit)}
          </span>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading && bets.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Minus className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No bets found.</p>
              <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <a href="/add">Add first bet</a>
              </Button>
            </div>
          ) : (
            <>
              {bets.map((bet) => (
                <BetRow key={bet.id} bet={bet} onRefresh={() => fetchBets(true)} liveScores={liveScores} />
              ))}
              {hasMore && (
                <div className="p-4 text-center border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

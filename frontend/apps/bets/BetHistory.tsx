import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, Trash2, TrendingUp, TrendingDown, Minus, Activity, X } from "lucide-react";
import {
  useLiveScores, matchLegToGame, computeLegResult, getParlayStatus,
  COMING_SOON_SPORTS,
  type LiveGame, type LegResult,
} from "./useLiveScores";
import { Button } from "@/components/ui/button";
import { apiGet } from "../api/api";
import { betsApi, formatOdds, formatMoney, type Bet } from "./bets";

// ── Design tokens ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  WON:     "bg-green-400",
  LOST:    "bg-red-400",
  PENDING: "bg-amber-400",
  PUSH:    "bg-blue-400",
  VOID:    "bg-[#8E8E93]",
};
const STATUS_TEXT: Record<string, string> = {
  WON:     "text-green-400",
  LOST:    "text-red-400",
  PENDING: "text-amber-400",
  PUSH:    "text-blue-400",
  VOID:    "text-[#8E8E93]",
};
const STATUS_BORDER: Record<string, string> = {
  WON:     "border-l-green-400/60",
  LOST:    "border-l-red-400/60",
  PENDING: "border-l-amber-400/40",
  PUSH:    "border-l-blue-400/60",
  VOID:    "border-l-white/10",
};

const SPORTSBOOK_COLORS: Record<string, string> = {
  DraftKings: "#53D338", FanDuel: "#1493FF", BetMGM: "#C9A84C",
  Caesars: "#0A8FFF", "ESPN Bet": "#FF6600", Fanatics: "#FF0060",
};
function sbColor(sb?: string) { return SPORTSBOOK_COLORS[sb ?? ""] ?? "#8E8E93"; }

// ── Filter pills ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All",     value: "ALL" },
  { label: "Active",  value: "PENDING" },
  { label: "Won",     value: "WON" },
  { label: "Lost",    value: "LOST" },
  { label: "Push",    value: "PUSH" },
];

const TYPE_FILTERS = [
  { label: "All",    value: "ALL" },
  { label: "Straight", value: "STRAIGHT" },
  { label: "Parlay", value: "PARLAY" },
];


// ── Score / status helpers ─────────────────────────────────────────────────────

function ScoreBadge({ game, result }: { game: LiveGame; result?: LegResult }) {
  if (game.homeScore == null && game.awayScore == null) return null;
  const awayNick = game.awayTeam.split(" ").pop() ?? game.awayTeamCode;
  const homeNick = game.homeTeam.split(" ").pop() ?? game.homeTeamCode;
  let period = "";
  if (game.isFinal) period = `· ${game.periodLabel ?? "F"}`;
  else if (game.isLive && game.periodLabel) {
    period = `· ${game.periodLabel}`;
    if (game.timeRemaining) period += ` ${game.timeRemaining}`;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
      game.isLive
        ? result === "winning" ? "bg-green-500/15 text-green-400 border-green-500/30"
        : result === "losing"  ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : "bg-white/5 text-[#8E8E93] border-white/10"
    }`}>
      {game.isLive && (
        <span className={`size-1.5 rounded-full inline-block animate-pulse ${
          result === "winning" ? "bg-green-400" : result === "losing" ? "bg-red-400" : "bg-blue-400"
        }`} />
      )}
      {awayNick} {game.awayScore} @ {homeNick} {game.homeScore}
      {period && <span className="opacity-60"> {period}</span>}
    </span>
  );
}

function LegStatusIcon({ status }: { status: LegResult }) {
  if (!status) return null;
  if (status === "winning") return <TrendingUp className="size-3 text-green-400" />;
  if (status === "losing")  return <TrendingDown className="size-3 text-red-400" />;
  return <Minus className="size-3 text-yellow-400" />;
}

// ── Bet Card ──────────────────────────────────────────────────────────────────

function BetCard({ bet, onRefresh, liveGames }: { bet: Bet; onRefresh: () => void; liveGames: LiveGame[] }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteBet() {
    if (!confirm("Delete this bet?")) return;
    setDeleting(true);
    try { await betsApi.remove(bet.id); onRefresh(); }
    catch { setDeleting(false); }
  }

  const isPending = bet.status === "PENDING";
  const profit = Number(bet.profit ?? 0);
  const label = bet.type === "PARLAY"
    ? `${bet.legs.length}-Leg Parlay`
    : bet.legs[0]?.pick ?? "Straight Bet";

  // Parlay summary
  const ps = bet.type === "PARLAY" && bet.legs.length > 1
    ? getParlayStatus(bet.legs, liveGames)
    : null;

  return (
    <>


      <div
        className={`bg-[#1A1A1A] rounded-2xl border-l-4 overflow-hidden ${STATUS_BORDER[bet.status] ?? "border-l-white/10"}`}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Main row */}
        <button
          className="w-full text-left p-4"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex items-start gap-3">
            {/* Status dot */}
            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[bet.status] ?? "bg-[#8E8E93]"}`} />

            <div className="flex-1 min-w-0">
              {/* Top: label + amount */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-white text-[15px] leading-snug truncate pr-2">
                  {label}
                </p>
                <div className="text-right shrink-0">
                  <p className={`text-base font-bold ${
                    isPending ? "text-white" :
                    profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {isPending ? `$${Number(bet.stake).toFixed(2)}` : formatMoney(profit)}
                  </p>
                  <p className="text-[10px] text-[#8E8E93]">{isPending ? "at risk" : "profit"}</p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                {bet.sportsbook && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ color: sbColor(bet.sportsbook), background: `${sbColor(bet.sportsbook)}15` }}
                  >
                    {bet.sportsbook}
                  </span>
                )}
                <span className="text-[10px] text-[#8E8E93]">
                  {formatOdds(bet.odds)} · ${Number(bet.stake).toFixed(0)} stake
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  {new Date(bet.betDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className={`text-[10px] font-bold uppercase ${STATUS_TEXT[bet.status]}`}>
                  {bet.status}
                </span>
              </div>

              {/* Parlay progress bar */}
              {ps && (
                <div className="mt-2.5 space-y-1">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                    {ps.won  > 0 && <div className="bg-green-400 h-full transition-all" style={{ width: `${(ps.won / ps.total) * 100}%` }} />}
                    {ps.live > 0 && <div className="bg-blue-400 h-full animate-pulse" style={{ width: `${(ps.live / ps.total) * 100}%` }} />}
                    {ps.lost > 0 && <div className="bg-red-400 h-full transition-all" style={{ width: `${(ps.lost / ps.total) * 100}%` }} />}
                  </div>
                  <p className="text-[10px] text-[#8E8E93]">
                    {ps.won}✓ {ps.lost > 0 ? `${ps.lost}✗ ` : ""}{ps.live > 0 ? `${ps.live} live ` : ""}{ps.pending > 0 ? `${ps.pending} pending` : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Expand toggle */}
            <div className="shrink-0 mt-1">
              {expanded
                ? <ChevronUp className="size-4 text-[#8E8E93]" />
                : <ChevronDown className="size-4 text-[#8E8E93]" />
              }
            </div>
          </div>
        </button>

        {/* Expanded section */}
        {expanded && (
          <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3">
            {/* Legs */}
            {bet.legs.length > 0 && (
              <div className="space-y-2">
                {bet.legs.map((leg, i) => {
                  const game = matchLegToGame(leg, liveGames);
                  const result = game ? computeLegResult(leg, game) : null;
                  const isLive = isPending && (game?.isLive ?? false);
                  const comingSoon = COMING_SOON_SPORTS.has((leg.sport ?? "").toUpperCase());

                  // ── Progress bar: math-based ─────────────────────────
                  const settled = !!leg.result || !isPending;

                  // Parse pick text — handle OCR variants: "Over 14.5" / "o 14.5" / "O14.5"
                  const pickText = (leg.pick ?? "").toLowerCase();
                  const isOver  = /\bover\b|\bo\s*\d/.test(pickText);
                  const isUnder = /\bunder\b|\bu\s*\d/.test(pickText);
                  const isTotal = isOver || isUnder;

                  // Extract numeric line: "Over 14.5", "O 8.5", "-2.5", "+3"
                  const totalLineMatch  = pickText.match(/(?:over|under|[ou])\s*([\d.]+)/i);
                  const spreadLineMatch = pickText.match(/([+-]\d+(?:\.\d+)?)/);
                  const totalLine  = isTotal && totalLineMatch  ? parseFloat(totalLineMatch[1])  : null;
                  const spreadLine = !isTotal && spreadLineMatch ? parseFloat(spreadLineMatch[1]) : null;

                  const gHome = game?.homeScore ?? null;
                  const gAway = game?.awayScore ?? null;
                  const currentTotal = (gHome ?? 0) + (gAway ?? 0);

                  // Compute fill percentage — purely how far along we are, NO win/loss color while live
                  let barPct = 0;
                  if (settled || bet.status === "LOST") {
                    barPct = 100;
                  } else if (isLive && game) {
                    if (isTotal && totalLine && totalLine > 0) {
                      // e.g. 1+0=1 on Over 14.5 → 7%
                      barPct = Math.min(99, Math.round((currentTotal / totalLine) * 100));
                    } else if (spreadLine !== null && gHome !== null && gAway !== null) {
                      // How much of the spread has been covered
                      const margin = Math.abs(gHome - gAway);
                      const needed = Math.abs(spreadLine);
                      // 50% base + scale by margin/needed, capped at 95% while live
                      barPct = Math.min(95, Math.max(5, Math.round(50 + (margin / Math.max(needed, 1)) * 45 * (result === "winning" ? 1 : -1))));
                    } else {
                      // Moneyline — no math possible, just show 50%
                      barPct = 50;
                    }
                  }

                  // Color: mathematically green/red/grey while live, definitive when settled
                  const barColor = settled
                    ? leg.result === "WON"  ? "bg-[#30D158]"
                    : leg.result === "LOST" ? "bg-[#E21111]"
                    : leg.result === "PUSH" ? "bg-[#5AC8FA]"
                    : bet.status === "WON"  ? "bg-[#30D158]"
                    : bet.status === "LOST" ? "bg-[#E21111]"
                    : "bg-[#636366]"
                    : isLive
                    ? result === "winning" ? "bg-[#30D158]"  // currently hitting → green
                    : result === "losing"  ? "bg-[#E21111]"  // currently missing → red
                    : "bg-[#48484A]"                         // tied / can't tell → neutral
                    : "bg-[#2C2C2E]";                        // not started yet

                  const barWidth = `${barPct}%`;

                  const legSport = (leg.sport ?? "").toUpperCase() || "NBA";
                  return (
                    <div
                      key={leg.id}
                      className="bg-[#141414] border border-white/[0.05] rounded-xl px-3 pt-2.5 pb-2 text-sm cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => { window.location.href = `/odds?sport=${legSport}`; }}
                    >
                      {/* Pick row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#48484A] text-[10px] font-bold w-4 shrink-0">{i + 1}</span>
                        <span className="font-semibold text-white flex-1 min-w-0 truncate text-[13px]">{leg.pick ?? "—"}</span>
                        {leg.odds != null && (
                          <span className="font-mono text-[#636366] text-[11px] shrink-0">
                            {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                          </span>
                        )}
                        {settled && (
                          <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            leg.result === "WON"  ? "text-[#30D158]"
                            : leg.result === "LOST" ? "text-[#E21111]"
                            : leg.result === "PUSH" ? "text-[#5AC8FA]"
                            : "text-[#636366]"
                          }`}>
                            {leg.result}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="relative h-1 bg-[#2C2C2E] rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${barColor} ${
                            isLive && !settled ? "animate-pulse" : ""
                          }`}
                          style={{ width: barWidth }}
                        />
                      </div>

                      {/* Final/live score tag */}
                      {game && (
                        <div className="mt-1.5 pl-4">
                          <ScoreBadge game={game} result={result} />
                        </div>
                      )}
                      {isPending && !game && comingSoon && (
                        <p className="mt-1 pl-4 text-[10px] text-[#636366]">
                          {(leg.sport ?? "").toUpperCase()} tracking coming soon
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {bet.notes && (
              <p className="text-xs text-[#8E8E93] italic px-1">{bet.notes}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">

              <button
                disabled={deleting}
                onClick={deleteBet}
                className="flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold rounded-xl py-2.5 px-4 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/[0.06] animate-pulse">
      <div className="flex gap-3">
        <div className="mt-1 w-2 h-2 rounded-full bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-white/10 rounded w-40" />
            <div className="h-4 bg-white/10 rounded w-16" />
          </div>
          <div className="h-3 bg-white/5 rounded w-32" />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BetHistory() {
  const liveGames = useLiveScores();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => { fetchBets(true); }, [statusFilter, typeFilter]);
  useEffect(() => {
    const t = setTimeout(() => fetchBets(true), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { if (page > 1) fetchBets(false); }, [page]);

  const pendingCount = bets.filter((b) => b.status === "PENDING").length;

  return (
    <div className="px-4 pt-10 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Bets</h1>
          <p className="text-sm text-[#8E8E93] mt-0.5">
            {pendingCount > 0 ? `${pendingCount} active` : "All bets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center"
          >
            {showSearch ? <X className="size-4 text-[#8E8E93]" /> : <Search className="size-4 text-[#8E8E93]" />}
          </button>
          <a
            href="/add"
            className="h-9 px-4 bg-[#E21111] text-white text-sm font-bold rounded-full flex items-center"
          >
            + Add
          </a>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8E8E93]" />
          <input
            autoFocus
            placeholder="Search picks, sportsbooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#8E8E93] outline-none focus:border-[#E21111]/40"
          />
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              statusFilter === f.value
                ? "bg-[#E21111] text-white"
                : "bg-[#1A1A1A] text-[#8E8E93] border border-white/[0.06]"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="h-1 shrink-0 w-px" />
        {TYPE_FILTERS.slice(1).map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(typeFilter === f.value ? "ALL" : f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              typeFilter === f.value
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-[#8E8E93] border-white/[0.06]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bet list */}
      {loading && bets.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : bets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
            <Activity className="size-7 text-[#8E8E93]" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">No bets found</p>
          <p className="text-[#8E8E93] text-sm mb-5">
            {statusFilter !== "ALL" ? "Try changing the filter above." : "Scan a bet slip to get started."}
          </p>
          <a
            href="/add"
            className="bg-[#E21111] text-white font-semibold text-sm px-6 py-3 rounded-full"
          >
            Scan Bet Slip
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} onRefresh={() => fetchBets(true)} liveGames={liveGames} />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#1A1A1A] border border-white/[0.06] text-[#8E8E93] text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

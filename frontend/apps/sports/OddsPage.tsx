import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { apiGet, apiPost } from "../api/api";
import { useLiveScores, type LiveGame } from "../bets/useLiveScores";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

interface GameOdds {
  gameId: string; sport: string;
  homeTeam: string; awayTeam: string;
  gameTime: string; status: string;
  homeScore: number | null; awayScore: number | null;
  spread: number | null; overUnder: number | null;
  homeMoneyline: number | null; awayMoneyline: number | null;
  sportsbooks: { sportsbook: string; spread: number | null; overUnder: number | null; homeMoneyline: number | null; awayMoneyline: number | null }[];
}

function normTeam(s: string) { return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function findLiveGame(game: GameOdds, liveGames: LiveGame[]): LiveGame | null {
  const homeN = normTeam(game.homeTeam);
  const awayN = normTeam(game.awayTeam);
  for (const lg of liveGames) {
    const lgHome = normTeam(lg.homeTeam);
    const lgAway = normTeam(lg.awayTeam);
    if (
      (homeN.includes(lgHome.slice(-5)) || lgHome.includes(homeN.slice(-5))) &&
      (awayN.includes(lgAway.slice(-5)) || lgAway.includes(awayN.slice(-5)))
    ) return lg;
  }
  return null;
}

function fmtOdds(n: number | null) { if (n == null) return "—"; return n > 0 ? `+${n}` : String(n); }
function fmtTime(iso: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}

// ── Odds pill ─────────────────────────────────────────────────────────────────
function OddsPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-[#111] rounded-xl px-2 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] mb-0.5">{label}</p>
      <p className="text-xs font-bold text-white font-mono">{value}</p>
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────────
function GameCard({ game, liveGame }: { game: GameOdds; liveGame?: LiveGame | null }) {
  const [showBooks, setShowBooks] = useState(false);
  const isLive = liveGame?.isLive ?? game.status === "InProgress";
  const isFinal = liveGame?.isFinal ?? game.status === "Final";
  const awayScore = liveGame?.awayScore ?? game.awayScore;
  const homeScore = liveGame?.homeScore ?? game.homeScore;
  const periodLabel = liveGame?.periodLabel ?? null;
  const timeRemaining = liveGame?.timeRemaining ?? null;

  const awayWinning = isLive && awayScore != null && homeScore != null && awayScore > homeScore;
  const homeWinning = isLive && homeScore != null && awayScore != null && homeScore > awayScore;

  const statusLine = isFinal
    ? `FINAL${periodLabel ? ` · ${periodLabel}` : ""}`
    : isLive
    ? `LIVE${periodLabel ? ` · ${periodLabel}` : ""}${timeRemaining ? ` · ${timeRemaining}` : ""}`
    : fmtTime(game.gameTime);

  return (
    <div className={`bg-[#1A1A1A] rounded-2xl overflow-hidden border ${
      isLive ? "border-green-500/30" : "border-white/[0.06]"
    }`}>
      {/* Live stripe */}
      {isLive && <div className="h-0.5 bg-gradient-to-r from-green-500 to-emerald-400" />}

      <div className="p-4">
        {/* Status row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {isLive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <span className={`text-[11px] font-bold uppercase tracking-wide ${
              isFinal ? "text-[#8E8E93]" : isLive ? "text-green-400" : "text-[#8E8E93]"
            }`}>
              {statusLine}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] bg-white/[0.06] px-2 py-0.5 rounded-full">
            {game.sport}
          </span>
        </div>

        {/* Teams + Scores */}
        <div className="space-y-2 mb-4">
          {/* Away */}
          <div className="flex items-center justify-between">
            <p className={`text-[15px] font-bold leading-tight ${awayWinning ? "text-white" : isFinal || isLive ? "text-[#8E8E93]" : "text-white"}`}>
              {game.awayTeam}
            </p>
            {(isFinal || isLive) && (
              <p className={`text-2xl font-black tabular-nums ${awayWinning ? "text-white" : "text-[#8E8E93]"}`}>
                {awayScore ?? "—"}
              </p>
            )}
          </div>
          {/* Home */}
          <div className="flex items-center justify-between">
            <p className={`text-[15px] font-bold leading-tight ${homeWinning ? "text-white" : isFinal || isLive ? "text-[#8E8E93]" : "text-white"}`}>
              {game.homeTeam}
            </p>
            {(isFinal || isLive) && (
              <p className={`text-2xl font-black tabular-nums ${homeWinning ? "text-white" : "text-[#8E8E93]"}`}>
                {homeScore ?? "—"}
              </p>
            )}
          </div>
        </div>

        {/* Odds pills */}
        {!isFinal && (
          <div className="flex gap-2">
            <OddsPill label="Spread" value={`${fmtOdds(game.spread)} / ${fmtOdds(game.spread ? -game.spread : null)}`} />
            <OddsPill label="Total" value={game.overUnder != null ? String(game.overUnder) : "—"} />
            <OddsPill label="ML" value={`${fmtOdds(game.awayMoneyline)} / ${fmtOdds(game.homeMoneyline)}`} />
          </div>
        )}

        {/* Sportsbook breakdown toggle */}
        {!isFinal && game.sportsbooks.length > 1 && (
          <div className="mt-3 border-t border-white/[0.04] pt-3">
            <button
              onClick={() => setShowBooks((b) => !b)}
              className="flex items-center gap-1 text-[11px] text-[#8E8E93] font-semibold"
            >
              {showBooks ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {showBooks ? "Hide" : "Compare"} books ({game.sportsbooks.length})
            </button>
            {showBooks && (
              <div className="mt-2 space-y-1.5">
                <div className="grid grid-cols-4 text-[10px] text-[#8E8E93] font-semibold uppercase tracking-wide pb-1">
                  <span>Book</span>
                  <span className="text-center">Spread</span>
                  <span className="text-center">O/U</span>
                  <span className="text-center">ML</span>
                </div>
                {game.sportsbooks.slice(0, 5).map((sb) => (
                  <div key={sb.sportsbook} className="grid grid-cols-4 text-xs items-center">
                    <span className="text-[#8E8E93] truncate">{sb.sportsbook}</span>
                    <span className="text-center font-mono text-white">{fmtOdds(sb.spread)}</span>
                    <span className="text-center font-mono text-white">{sb.overUnder ?? "—"}</span>
                    <span className="text-center font-mono text-white">{fmtOdds(sb.homeMoneyline)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/[0.06] animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-3 bg-white/10 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-8" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-white/10 rounded w-32" />
          <div className="h-6 bg-white/5 rounded w-8" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-white/10 rounded w-28" />
          <div className="h-6 bg-white/5 rounded w-8" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-10 bg-white/5 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function OddsPage() {
  const [sport, setSport] = useState("NBA");
  const [games, setGames] = useState<GameOdds[]>([]);
  const liveGames = useLiveScores();
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ graded: number; skipped: number } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchOdds = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const data = await apiGet<GameOdds[]>(`/api/sports/odds?sport=${s}`);
      setGames(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOdds(sport); }, [sport]);

  async function gradeNow() {
    setGrading(true); setGradeResult(null);
    try { const r = await apiPost<{ graded: number; skipped: number }>("/api/sports/grade", {}); setGradeResult(r); }
    catch { setGradeResult({ graded: 0, skipped: 0 }); }
    finally { setGrading(false); }
  }

  const liveCount = games.filter((g) => g.status === "InProgress").length;

  return (
    <div className="px-4 pt-10 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Live Odds</h1>
          <p className="text-sm text-[#8E8E93] mt-0.5">
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
              : "Today's lines"}
            {liveCount > 0 && <span className="text-green-400 ml-1.5">· {liveCount} live</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchOdds(sport)}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-[#8E8E93] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={gradeNow}
            disabled={grading}
            className="h-9 px-4 bg-[#E21111] hover:bg-[#c81010] text-white text-sm font-bold rounded-full flex items-center gap-1.5 disabled:opacity-60 transition-colors"
          >
            {grading
              ? <><RefreshCw className="size-3.5 animate-spin" /> Grading…</>
              : <><CheckCircle className="size-3.5" /> Grade</>
            }
          </button>
        </div>
      </div>

      {/* Grade result */}
      {gradeResult && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl px-4 py-3 text-sm text-green-400 font-medium">
          ✓ Graded {gradeResult.graded} bet{gradeResult.graded !== 1 ? "s" : ""}.
          {gradeResult.skipped > 0 && ` ${gradeResult.skipped} still pending.`}
        </div>
      )}

      {/* Sport pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              sport === s ? "bg-[#E21111] text-white" : "bg-[#1A1A1A] text-[#8E8E93] border border-white/[0.06]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Games grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1,2,3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center">
            <Clock className="size-6 text-[#8E8E93]" />
          </div>
          <p className="text-white font-semibold">No {sport} games today</p>
          <p className="text-[#8E8E93] text-sm">Check back later or switch leagues</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} liveGame={findLiveGame(game, liveGames)} />
          ))}
        </div>
      )}
    </div>
  );
}

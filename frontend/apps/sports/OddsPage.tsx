import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost } from "../api/api";
import { useLiveScores, type LiveGame } from "../bets/useLiveScores";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

interface GameOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  spread: number | null;
  overUnder: number | null;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  sportsbooks: { sportsbook: string; spread: number | null; overUnder: number | null; homeMoneyline: number | null; awayMoneyline: number | null }[];
}

/** Normalize a team name for fuzzy matching */
function normTeam(s: string) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Find a LiveGame that matches the odds game by team names */
function findLiveGame(game: GameOdds, liveGames: LiveGame[]): LiveGame | null {
  const homeN = normTeam(game.homeTeam);
  const awayN = normTeam(game.awayTeam);
  for (const lg of liveGames) {
    const lgHome = normTeam(lg.homeTeam);
    const lgAway = normTeam(lg.awayTeam);
    // Match if home+away pair overlap (either direction)
    if (
      (homeN.includes(lgHome.slice(-5)) || lgHome.includes(homeN.slice(-5))) &&
      (awayN.includes(lgAway.slice(-5)) || lgAway.includes(awayN.slice(-5)))
    ) {
      return lg;
    }
  }
  return null;
}

function fmtOdds(n: number | null): string {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function fmtSpread(n: number | null): string {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function fmtTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return iso; }
}

function statusColor(status: string) {
  if (status === "Final") return "text-muted-foreground";
  if (status === "InProgress") return "text-green-400";
  return "text-foreground";
}

function GameCard({ game, liveGame }: { game: GameOdds; liveGame?: LiveGame | null }) {
  // Prefer real-time data from our live scores backend over stale odds API data
  const isLive = liveGame?.isLive ?? game.status === "InProgress";
  const isFinal = liveGame?.isFinal ?? game.status === "Final";
  const awayScore = liveGame?.awayScore ?? game.awayScore;
  const homeScore = liveGame?.homeScore ?? game.homeScore;
  const periodLabel = liveGame?.periodLabel ?? null;
  const timeRemaining = liveGame?.timeRemaining ?? null;

  // Period/status line shown next to LIVE badge
  const periodLine = periodLabel
    ? timeRemaining
      ? `${periodLabel} · ${timeRemaining}`
      : periodLabel
    : null;

  return (
    <Card className={`bg-card border-border transition-colors ${isLive ? "border-green-500/30" : ""}`}>
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <span className={`text-xs font-medium ${statusColor(game.status)}`}>
              {isFinal
                ? `FINAL${periodLabel ? ` · ${periodLabel}` : ""}`
                : isLive
                ? periodLine ? `LIVE · ${periodLine}` : "LIVE"
                : fmtTime(game.gameTime)}
            </span>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground border-border">
            {game.sport}
          </Badge>
        </div>

        {/* Teams + Score */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{game.awayTeam}</span>
            {(isFinal || isLive) && (
              <span className={`text-lg font-bold ${
                isLive && awayScore != null && homeScore != null && awayScore > homeScore
                  ? "text-green-400" : "text-foreground"
              }`}>
                {awayScore ?? "—"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{game.homeTeam}</span>
            {(isFinal || isLive) && (
              <span className={`text-lg font-bold ${
                isLive && homeScore != null && awayScore != null && homeScore > awayScore
                  ? "text-green-400" : "text-foreground"
              }`}>
                {homeScore ?? "—"}
              </span>
            )}
          </div>
        </div>

        {/* Odds Grid */}
        {!isFinal && (
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">SPREAD</p>
              <p className="text-xs text-foreground">{fmtSpread(game.spread)} / {fmtSpread(game.spread ? -game.spread : null)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">TOTAL</p>
              <p className="text-xs text-foreground">{game.overUnder ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">ML</p>
              <p className="text-xs text-foreground">{fmtOdds(game.awayMoneyline)} / {fmtOdds(game.homeMoneyline)}</p>
            </div>
          </div>
        )}

        {/* Sportsbook breakdown */}
        {!isFinal && game.sportsbooks.length > 1 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">BY BOOK</p>
            <div className="space-y-1">
              {game.sportsbooks.slice(0, 4).map((sb) => (
                <div key={sb.sportsbook} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate w-24">{sb.sportsbook}</span>
                  <span className="text-foreground">{fmtSpread(sb.spread)}</span>
                  <span className="text-foreground">{sb.overUnder ?? "—"}</span>
                  <span className="text-foreground">{fmtOdds(sb.homeMoneyline)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOdds(sport); }, [sport]);

  async function handleGradeNow() {
    setGrading(true);
    setGradeResult(null);
    try {
      const result = await apiPost<{ graded: number; skipped: number }>("/api/sports/grade", {});
      setGradeResult(result);
    } catch {
      setGradeResult({ graded: 0, skipped: 0 });
    } finally {
      setGrading(false);
    }
  }

  const liveCount = games.filter((g) => g.status === "InProgress").length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Odds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Today's lines"}
            {liveCount > 0 && <span className="text-green-400 ml-2">· {liveCount} live</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground"
            onClick={() => fetchOdds(sport)}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleGradeNow}
            disabled={grading}
          >
            {grading ? (
              <><RefreshCw className="size-3.5 mr-1.5 animate-spin" />Grading…</>
            ) : (
              <><CheckCircle className="size-3.5 mr-1.5" />Grade Pending Bets</>
            )}
          </Button>
        </div>
      </div>

      {/* Grade result */}
      {gradeResult && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          ✓ Graded {gradeResult.graded} bet{gradeResult.graded !== 1 ? "s" : ""}.
          {gradeResult.skipped > 0 && ` ${gradeResult.skipped} pending (games not final yet).`}
        </div>
      )}

      {/* Sport tabs */}
      <Tabs value={sport} onValueChange={(v) => setSport(v)}>
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          {SPORTS.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-muted-foreground"
            >
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Games */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          <RefreshCw className="size-4 animate-spin mr-2" /> Loading odds…
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
          <Clock className="size-8 opacity-40" />
          <p className="text-sm">No {sport} games scheduled today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} liveGame={findLiveGame(game, liveGames)} />
          ))}
        </div>
      )}
    </div>
  );
}

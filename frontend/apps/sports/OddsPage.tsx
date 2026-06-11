import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
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
  sportsbooks: {
    sportsbook: string;
    spread: number | null; overUnder: number | null;
    homeMoneyline: number | null; awayMoneyline: number | null;
  }[];
}

// ── ESPN logo lookup ──────────────────────────────────────────────────────────

const NBA_LOGOS: Record<string, string> = {
  "Atlanta Hawks": "atl", "Boston Celtics": "bos", "Brooklyn Nets": "bkn",
  "Charlotte Hornets": "cha", "Chicago Bulls": "chi", "Cleveland Cavaliers": "cle",
  "Dallas Mavericks": "dal", "Denver Nuggets": "den", "Detroit Pistons": "det",
  "Golden State Warriors": "gs", "Houston Rockets": "hou", "Indiana Pacers": "ind",
  "Los Angeles Clippers": "lac", "LA Clippers": "lac",
  "Los Angeles Lakers": "lal", "LA Lakers": "lal",
  "Memphis Grizzlies": "mem", "Miami Heat": "mia", "Milwaukee Bucks": "mil",
  "Minnesota Timberwolves": "min", "New Orleans Pelicans": "no", "New York Knicks": "ny",
  "Oklahoma City Thunder": "okc", "Orlando Magic": "orl", "Philadelphia 76ers": "phi",
  "Phoenix Suns": "phx", "Portland Trail Blazers": "por", "Sacramento Kings": "sac",
  "San Antonio Spurs": "sa", "Toronto Raptors": "tor", "Utah Jazz": "utah",
  "Washington Wizards": "wsh",
};

const NFL_LOGOS: Record<string, string> = {
  "Arizona Cardinals": "ari", "Atlanta Falcons": "atl", "Baltimore Ravens": "bal",
  "Buffalo Bills": "buf", "Carolina Panthers": "car", "Chicago Bears": "chi",
  "Cincinnati Bengals": "cin", "Cleveland Browns": "cle", "Dallas Cowboys": "dal",
  "Denver Broncos": "den", "Detroit Lions": "det", "Green Bay Packers": "gb",
  "Houston Texans": "hou", "Indianapolis Colts": "ind", "Jacksonville Jaguars": "jax",
  "Kansas City Chiefs": "kc", "Las Vegas Raiders": "lv", "Los Angeles Chargers": "lac",
  "Los Angeles Rams": "lar", "Miami Dolphins": "mia", "Minnesota Vikings": "min",
  "New England Patriots": "ne", "New Orleans Saints": "no", "New York Giants": "nyg",
  "New York Jets": "nyj", "Philadelphia Eagles": "phi", "Pittsburgh Steelers": "pit",
  "San Francisco 49ers": "sf", "Seattle Seahawks": "sea", "Tampa Bay Buccaneers": "tb",
  "Tennessee Titans": "ten", "Washington Commanders": "wsh",
};

const MLB_LOGOS: Record<string, string> = {
  "Arizona Diamondbacks": "ari", "Atlanta Braves": "atl", "Baltimore Orioles": "bal",
  "Boston Red Sox": "bos", "Chicago Cubs": "chc", "Chicago White Sox": "chw",
  "Cincinnati Reds": "cin", "Cleveland Guardians": "cle", "Colorado Rockies": "col",
  "Detroit Tigers": "det", "Houston Astros": "hou", "Kansas City Royals": "kc",
  "Los Angeles Angels": "laa", "Los Angeles Dodgers": "lad", "Miami Marlins": "mia",
  "Milwaukee Brewers": "mil", "Minnesota Twins": "min", "New York Mets": "nym",
  "New York Yankees": "nyy", "Oakland Athletics": "oak", "Athletics": "oak",
  "Philadelphia Phillies": "phi", "Pittsburgh Pirates": "pit", "San Diego Padres": "sd",
  "San Francisco Giants": "sf", "Seattle Mariners": "sea", "St. Louis Cardinals": "stl",
  "Tampa Bay Rays": "tb", "Texas Rangers": "tex", "Toronto Blue Jays": "tor",
  "Washington Nationals": "wsh",
};

const NHL_LOGOS: Record<string, string> = {
  "Anaheim Ducks": "ana", "Arizona Coyotes": "ari", "Boston Bruins": "bos",
  "Buffalo Sabres": "buf", "Calgary Flames": "cgy", "Carolina Hurricanes": "car",
  "Chicago Blackhawks": "chi", "Colorado Avalanche": "col", "Columbus Blue Jackets": "cbj",
  "Dallas Stars": "dal", "Detroit Red Wings": "det", "Edmonton Oilers": "edm",
  "Florida Panthers": "fla", "Los Angeles Kings": "lak", "Minnesota Wild": "min",
  "Montreal Canadiens": "mtl", "Nashville Predators": "nsh", "New Jersey Devils": "njd",
  "New York Islanders": "nyi", "New York Rangers": "nyr", "Ottawa Senators": "ott",
  "Philadelphia Flyers": "phi", "Pittsburgh Penguins": "pit", "San Jose Sharks": "sjs",
  "Seattle Kraken": "sea", "St. Louis Blues": "stl", "Tampa Bay Lightning": "tbl",
  "Toronto Maple Leafs": "tor", "Vancouver Canucks": "van", "Vegas Golden Knights": "vgk",
  "Washington Capitals": "wsh", "Winnipeg Jets": "wpg",
};

const SPORT_MAP: Record<string, Record<string, string>> = {
  NBA: NBA_LOGOS, NFL: NFL_LOGOS, MLB: MLB_LOGOS, NHL: NHL_LOGOS,
};

function getLogoUrl(sport: string, teamName: string): string | null {
  const map = SPORT_MAP[sport.toUpperCase()];
  if (!map) return null;
  const abbrev = map[teamName];
  if (!abbrev) return null;
  const s = sport.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/${s}/500/${abbrev}.png`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normTeam(s: string) { return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

function findLiveGame(game: GameOdds, liveGames: LiveGame[]): LiveGame | null {
  const homeN = normTeam(game.homeTeam);
  const awayN = normTeam(game.awayTeam);
  for (const lg of liveGames) {
    if (
      (homeN.includes(normTeam(lg.homeTeam).slice(-5)) || normTeam(lg.homeTeam).includes(homeN.slice(-5))) &&
      (awayN.includes(normTeam(lg.awayTeam).slice(-5)) || normTeam(lg.awayTeam).includes(awayN.slice(-5)))
    ) return lg;
  }
  return null;
}

function fmtOdds(n: number | null) { return n == null ? "—" : n > 0 ? `+${n}` : String(n); }
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}

// ── Team logo ─────────────────────────────────────────────────────────────────

function TeamLogo({ sport, name, size = 36 }: { sport: string; name: string; size?: number }) {
  const url = getLogoUrl(sport, name);
  const initials = name.split(" ").slice(-1)[0]?.slice(0, 3).toUpperCase() ?? "?";
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div
        className="rounded-full bg-white/[0.06] flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="text-[10px] font-black text-[#8E8E93]">{initials}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className="object-contain shrink-0 drop-shadow-sm"
      style={{ width: size, height: size }}
    />
  );
}

// ── Team row inside card ──────────────────────────────────────────────────────

function TeamRow({ sport, name, score, winning, isScored }: {
  sport: string; name: string;
  score: number | null; winning: boolean; isScored: boolean;
}) {
  const nick = name.split(" ").slice(-1)[0];
  const city = name.split(" ").slice(0, -1).join(" ");

  return (
    <div className={`flex items-center gap-2.5 ${!winning && isScored ? "opacity-45" : ""}`}>
      <TeamLogo sport={sport} name={name} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white leading-none truncate">{nick}</p>
        <p className="text-[10px] text-[#8E8E93] leading-none mt-0.5 truncate">{city}</p>
      </div>
      {isScored && (
        <span className={`text-xl font-black tabular-nums ${winning ? "text-white" : "text-[#5A5A5A]"}`}>
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}

// ── Odds pill pair ────────────────────────────────────────────────────────────

function OddsPair({ label, away, home }: { label: string; away: string; home: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">{label}</p>
      <div className="w-full bg-[#111] rounded-lg py-1 px-1 text-center">
        <p className="text-[11px] font-mono text-[#8E8E93]">{away}</p>
        <div className="h-px bg-white/[0.06] my-0.5" />
        <p className="text-[11px] font-mono text-white">{home}</p>
      </div>
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────────

function GameCard({ game, liveGame }: { game: GameOdds; liveGame?: LiveGame | null }) {
  const [showOdds, setShowOdds] = useState(false);

  const isLive   = liveGame?.isLive   ?? game.status === "InProgress";
  const isFinal  = liveGame?.isFinal  ?? game.status === "Final";
  const isScored = isLive || isFinal;
  const awayScore = liveGame?.awayScore ?? game.awayScore;
  const homeScore = liveGame?.homeScore ?? game.homeScore;
  const periodLabel    = liveGame?.periodLabel ?? null;
  const timeRemaining  = liveGame?.timeRemaining ?? null;

  const hasScore   = awayScore != null && homeScore != null;
  const awayWins   = hasScore && awayScore! > homeScore!;
  const homeWins   = hasScore && homeScore! > awayScore!;
  const hasOdds    = game.spread != null || game.homeMoneyline != null || game.overUnder != null;

  const statusText = isLive
    ? `${periodLabel ?? "LIVE"}${timeRemaining ? ` · ${timeRemaining}` : ""}`
    : isFinal
    ? `Final${periodLabel ? ` · ${periodLabel}` : ""}`
    : fmtTime(game.gameTime);

  return (
    <div className={`bg-[#1A1A1A] rounded-2xl overflow-hidden border ${
      isLive ? "border-green-500/25" : "border-white/[0.05]"
    }`}>
      {isLive && <div className="h-0.5 bg-gradient-to-r from-green-500 to-emerald-400" />}

      <div className="px-3.5 pt-3 pb-3">
        {/* Status */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isLive ? "text-green-400" : "text-[#8E8E93]"
            }`}>
              {statusText}
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#4A4A4A]">
            {game.sport}
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-2">
          <TeamRow sport={game.sport} name={game.awayTeam} score={awayScore} winning={awayWins} isScored={isScored} />
          <div className="h-px bg-white/[0.04] ml-10" />
          <TeamRow sport={game.sport} name={game.homeTeam} score={homeScore} winning={homeWins} isScored={isScored} />
        </div>

        {/* Odds toggle */}
        {hasOdds && (
          <>
            <button
              onClick={() => setShowOdds((o) => !o)}
              className="w-full flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Lines</span>
              <div className="flex items-center gap-2">
                {!showOdds && game.homeMoneyline != null && (
                  <span className="text-[10px] font-mono text-[#5A5A5A]">
                    {fmtOdds(game.awayMoneyline)} · {fmtOdds(game.homeMoneyline)}
                  </span>
                )}
                {showOdds
                  ? <ChevronUp className="size-3 text-[#8E8E93]" />
                  : <ChevronDown className="size-3 text-[#8E8E93]" />
                }
              </div>
            </button>

            {showOdds && (
              <div className="mt-2.5 space-y-2.5">
                {/* Column labels */}
                <div className="flex gap-1.5 ml-0">
                  <div className="flex-1" />
                  {/* Away / Home labels */}
                </div>
                <div className="flex gap-1.5">
                  {game.spread != null && (
                    <OddsPair
                      label="Spread"
                      away={fmtOdds(game.spread ? -game.spread : game.spread)}
                      home={fmtOdds(game.spread)}
                    />
                  )}
                  {game.overUnder != null && (
                    <OddsPair
                      label="Total"
                      away={`O ${game.overUnder}`}
                      home={`U ${game.overUnder}`}
                    />
                  )}
                  {game.homeMoneyline != null && (
                    <OddsPair
                      label="ML"
                      away={fmtOdds(game.awayMoneyline)}
                      home={fmtOdds(game.homeMoneyline)}
                    />
                  )}
                </div>

                {/* Book comparison */}
                {game.sportsbooks.length > 1 && (
                  <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
                      Best lines by book
                    </p>
                    {game.sportsbooks.slice(0, 4).map((sb) => (
                      <div key={sb.sportsbook} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-20 text-[#8E8E93] truncate shrink-0">{sb.sportsbook}</span>
                        <div className="flex-1 flex gap-1">
                          <span className="flex-1 text-center font-mono text-[#8E8E93] bg-[#111] rounded py-0.5">{fmtOdds(sb.awayMoneyline)}</span>
                          <span className="flex-1 text-center font-mono text-white bg-[#111] rounded py-0.5">{fmtOdds(sb.homeMoneyline)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-3.5 border border-white/[0.05] animate-pulse space-y-2.5">
      <div className="h-2.5 bg-white/[0.06] rounded w-16" />
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-white/[0.08] rounded w-24" />
            <div className="h-2 bg-white/[0.04] rounded w-16" />
          </div>
          <div className="h-5 bg-white/[0.06] rounded w-7" />
        </div>
      ))}
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

  const fetchGames = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const data = await apiGet<GameOdds[]>(`/api/sports/odds?sport=${s}`);
      setGames(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGames(sport); }, [sport]);

  async function gradeNow() {
    setGrading(true); setGradeResult(null);
    try {
      const r = await apiPost<{ graded: number; skipped: number }>("/api/sports/grade", {});
      setGradeResult(r);
    } catch { setGradeResult({ graded: 0, skipped: 0 }); }
    finally { setGrading(false); }
  }

  const sortedGames = [...games].sort((a, b) => {
    const aLg = findLiveGame(a, liveGames);
    const bLg = findLiveGame(b, liveGames);
    const aLive  = aLg?.isLive   ?? a.status === "InProgress";
    const bLive  = bLg?.isLive   ?? b.status === "InProgress";
    const aFinal = aLg?.isFinal  ?? a.status === "Final";
    const bFinal = bLg?.isFinal  ?? b.status === "Final";
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    if (aFinal && !bFinal) return 1;
    if (!aFinal && bFinal) return -1;
    return 0;
  });

  const liveCount = sortedGames.filter((g) => {
    const lg = findLiveGame(g, liveGames);
    return lg?.isLive ?? g.status === "InProgress";
  }).length;

  return (
    <div className="px-4 pt-10 pb-28 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Scores</h1>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">
            {lastRefresh
              ? `${lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
              : "Today's games"}
            {liveCount > 0 && (
              <span className="text-green-400 ml-1.5 inline-flex items-center gap-1">
                · <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {liveCount} live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGames(sport)} disabled={loading}
            className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 text-[#8E8E93] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={gradeNow} disabled={grading}
            className="h-8 px-3 bg-[#E21111] hover:bg-[#c81010] text-white text-xs font-bold rounded-full flex items-center gap-1.5 disabled:opacity-60 transition-colors"
          >
            {grading
              ? <><RefreshCw className="size-3 animate-spin" /> Grading…</>
              : <><CheckCircle className="size-3" /> Grade</>
            }
          </button>
        </div>
      </div>

      {/* Grade result */}
      {gradeResult && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-3 py-2.5 text-xs text-green-400 font-medium">
          ✓ Graded {gradeResult.graded} bet{gradeResult.graded !== 1 ? "s" : ""}.
          {gradeResult.skipped > 0 && ` ${gradeResult.skipped} still pending.`}
        </div>
      )}

      {/* Sport pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {SPORTS.map((s) => (
          <button
            key={s} onClick={() => setSport(s)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              sport === s
                ? "bg-[#E21111] text-white"
                : "bg-[#1A1A1A] text-[#8E8E93] border border-white/[0.06]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Games */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
            <Clock className="size-5 text-[#8E8E93]" />
          </div>
          <p className="text-white font-semibold text-sm">No {sport} games today</p>
          <p className="text-[#8E8E93] text-xs">Switch leagues above to see more</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedGames.map((game) => (
            <GameCard key={game.gameId} game={game} liveGame={findLiveGame(game, liveGames)} />
          ))}
        </div>
      )}
    </div>
  );
}

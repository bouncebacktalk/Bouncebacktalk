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

// ── ESPN logo map ─────────────────────────────────────────────────────────────
const NBA_IDS: Record<string, string> = {
  "Atlanta Hawks":"atl","Boston Celtics":"bos","Brooklyn Nets":"bkn",
  "Charlotte Hornets":"cha","Chicago Bulls":"chi","Cleveland Cavaliers":"cle",
  "Dallas Mavericks":"dal","Denver Nuggets":"den","Detroit Pistons":"det",
  "Golden State Warriors":"gs","Houston Rockets":"hou","Indiana Pacers":"ind",
  "Los Angeles Clippers":"lac","LA Clippers":"lac",
  "Los Angeles Lakers":"lal","LA Lakers":"lal",
  "Memphis Grizzlies":"mem","Miami Heat":"mia","Milwaukee Bucks":"mil",
  "Minnesota Timberwolves":"min","New Orleans Pelicans":"no","New York Knicks":"ny",
  "Oklahoma City Thunder":"okc","Orlando Magic":"orl","Philadelphia 76ers":"phi",
  "Phoenix Suns":"phx","Portland Trail Blazers":"por","Sacramento Kings":"sac",
  "San Antonio Spurs":"sa","Toronto Raptors":"tor","Utah Jazz":"utah",
  "Washington Wizards":"wsh",
};
const NFL_IDS: Record<string, string> = {
  "Arizona Cardinals":"ari","Atlanta Falcons":"atl","Baltimore Ravens":"bal",
  "Buffalo Bills":"buf","Carolina Panthers":"car","Chicago Bears":"chi",
  "Cincinnati Bengals":"cin","Cleveland Browns":"cle","Dallas Cowboys":"dal",
  "Denver Broncos":"den","Detroit Lions":"det","Green Bay Packers":"gb",
  "Houston Texans":"hou","Indianapolis Colts":"ind","Jacksonville Jaguars":"jax",
  "Kansas City Chiefs":"kc","Las Vegas Raiders":"lv","Los Angeles Chargers":"lac",
  "Los Angeles Rams":"lar","Miami Dolphins":"mia","Minnesota Vikings":"min",
  "New England Patriots":"ne","New Orleans Saints":"no","New York Giants":"nyg",
  "New York Jets":"nyj","Philadelphia Eagles":"phi","Pittsburgh Steelers":"pit",
  "San Francisco 49ers":"sf","Seattle Seahawks":"sea","Tampa Bay Buccaneers":"tb",
  "Tennessee Titans":"ten","Washington Commanders":"wsh",
};
const MLB_IDS: Record<string, string> = {
  "Arizona Diamondbacks":"ari","Atlanta Braves":"atl","Baltimore Orioles":"bal",
  "Boston Red Sox":"bos","Chicago Cubs":"chc","Chicago White Sox":"chw",
  "Cincinnati Reds":"cin","Cleveland Guardians":"cle","Colorado Rockies":"col",
  "Detroit Tigers":"det","Houston Astros":"hou","Kansas City Royals":"kc",
  "Los Angeles Angels":"laa","Los Angeles Dodgers":"lad","Miami Marlins":"mia",
  "Milwaukee Brewers":"mil","Minnesota Twins":"min","New York Mets":"nym",
  "New York Yankees":"nyy","Oakland Athletics":"oak","Athletics":"oak",
  "Philadelphia Phillies":"phi","Pittsburgh Pirates":"pit","San Diego Padres":"sd",
  "San Francisco Giants":"sf","Seattle Mariners":"sea","St. Louis Cardinals":"stl",
  "Tampa Bay Rays":"tb","Texas Rangers":"tex","Toronto Blue Jays":"tor",
  "Washington Nationals":"wsh",
};
const NHL_IDS: Record<string, string> = {
  "Anaheim Ducks":"ana","Arizona Coyotes":"ari","Boston Bruins":"bos",
  "Buffalo Sabres":"buf","Calgary Flames":"cgy","Carolina Hurricanes":"car",
  "Chicago Blackhawks":"chi","Colorado Avalanche":"col","Columbus Blue Jackets":"cbj",
  "Dallas Stars":"dal","Detroit Red Wings":"det","Edmonton Oilers":"edm",
  "Florida Panthers":"fla","Los Angeles Kings":"lak","Minnesota Wild":"min",
  "Montreal Canadiens":"mtl","Nashville Predators":"nsh","New Jersey Devils":"njd",
  "New York Islanders":"nyi","New York Rangers":"nyr","Ottawa Senators":"ott",
  "Philadelphia Flyers":"phi","Pittsburgh Penguins":"pit","San Jose Sharks":"sjs",
  "Seattle Kraken":"sea","St. Louis Blues":"stl","Tampa Bay Lightning":"tbl",
  "Toronto Maple Leafs":"tor","Vancouver Canucks":"van","Vegas Golden Knights":"vgk",
  "Washington Capitals":"wsh","Winnipeg Jets":"wpg",
};
const LOGO_MAP: Record<string, Record<string, string>> = {
  NBA: NBA_IDS, NFL: NFL_IDS, MLB: MLB_IDS, NHL: NHL_IDS,
};

function getLogoUrl(sport: string, team: string) {
  const abbr = LOGO_MAP[sport.toUpperCase()]?.[team];
  if (!abbr) return null;
  return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${abbr}.png`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normTeam(s: string) { return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function findLiveGame(game: GameOdds, liveGames: LiveGame[]): LiveGame | null {
  const hN = normTeam(game.homeTeam), aN = normTeam(game.awayTeam);
  for (const lg of liveGames) {
    const lhN = normTeam(lg.homeTeam), laN = normTeam(lg.awayTeam);
    if ((hN.includes(lhN.slice(-5)) || lhN.includes(hN.slice(-5))) &&
        (aN.includes(laN.slice(-5)) || laN.includes(aN.slice(-5)))) return lg;
  }
  return null;
}
function fmtOdds(n: number | null) { return n == null ? "—" : n > 0 ? `+${n}` : String(n); }
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}

// ── Team logo with fallback ────────────────────────────────────────────────────
function Logo({ sport, name, size = 40 }: { sport: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(sport, name);
  const init = name.split(" ").slice(-1)[0]?.slice(0, 3) ?? "?";
  if (!url || err) {
    return (
      <div style={{ width: size, height: size }}
        className="rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
        <span className="text-[9px] font-black text-[#8E8E93]">{init}</span>
      </div>
    );
  }
  return (
    <img src={url} alt={name} width={size} height={size} onError={() => setErr(true)}
      className="object-contain shrink-0" style={{ width: size, height: size }} />
  );
}

// ── Compact team row ──────────────────────────────────────────────────────────
function TeamLine({ sport, name, score, winning, isScored }: {
  sport: string; name: string; score: number | null;
  winning: boolean; isScored: boolean;
}) {
  const nick = name.split(" ").slice(-1)[0];
  const city = name.split(" ").slice(0, -1).join(" ");
  return (
    <div className={`flex items-center gap-2 ${isScored && !winning ? "opacity-40" : ""}`}>
      <Logo sport={sport} name={name} size={28} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white leading-tight truncate">{nick}</p>
        <p className="text-[9px] text-[#8E8E93] leading-none truncate">{city}</p>
      </div>
      {isScored && (
        <span className={`text-[22px] font-black tabular-nums leading-none ${
          winning ? "text-white" : "text-[#555]"
        }`}>
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}

// ── Odds collapsible ──────────────────────────────────────────────────────────
function OddsDrawer({ game }: { game: GameOdds }) {
  const [open, setOpen] = useState(false);
  const hasOdds = game.spread != null || game.homeMoneyline != null || game.overUnder != null;
  if (!hasOdds) return null;

  const awayNick = game.awayTeam.split(" ").slice(-1)[0];
  const homeNick = game.homeTeam.split(" ").slice(-1)[0];

  return (
    <div className="border-t border-white/[0.05] mt-2.5">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between pt-2 pb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#555]">Betting Lines</span>
        <div className="flex items-center gap-2">
          {!open && game.homeMoneyline != null && (
            <span className="text-[10px] font-mono text-[#555]">
              {fmtOdds(game.awayMoneyline)} / {fmtOdds(game.homeMoneyline)}
            </span>
          )}
          {open ? <ChevronUp className="size-3 text-[#555]" /> : <ChevronDown className="size-3 text-[#555]" />}
        </div>
      </button>
      {open && (
        <div className="pt-2 space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-[#555] mb-1">
            <span />
            <span className="text-center">Spread</span>
            <span className="text-center">O/U</span>
            <span className="text-center">ML</span>
          </div>
          {/* Away row */}
          <div className="grid grid-cols-4 text-[11px] items-center">
            <span className="text-[#8E8E93] font-semibold truncate">{awayNick}</span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {game.spread != null ? fmtOdds(-game.spread) : "—"}
            </span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {game.overUnder != null ? `O ${game.overUnder}` : "—"}
            </span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {fmtOdds(game.awayMoneyline)}
            </span>
          </div>
          {/* Home row */}
          <div className="grid grid-cols-4 text-[11px] items-center">
            <span className="text-[#8E8E93] font-semibold truncate">{homeNick}</span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {fmtOdds(game.spread)}
            </span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {game.overUnder != null ? `U ${game.overUnder}` : "—"}
            </span>
            <span className="text-center font-mono text-white bg-[#111] rounded py-1">
              {fmtOdds(game.homeMoneyline)}
            </span>
          </div>
          {/* Multi-book */}
          {game.sportsbooks.length > 1 && (
            <div className="pt-2 border-t border-white/[0.05] space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#555]">Books (ML)</p>
              {game.sportsbooks.slice(0, 4).map(sb => (
                <div key={sb.sportsbook} className="grid grid-cols-4 text-[10px] items-center">
                  <span className="text-[#555] truncate col-span-2">{sb.sportsbook}</span>
                  <span className="text-center font-mono text-[#8E8E93]">{fmtOdds(sb.awayMoneyline)}</span>
                  <span className="text-center font-mono text-white">{fmtOdds(sb.homeMoneyline)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Game card — compact ESPN-style ────────────────────────────────────────────
function GameCard({ game, liveGame }: { game: GameOdds; liveGame?: LiveGame | null }) {
  const isLive  = liveGame?.isLive  ?? game.status === "InProgress";
  const isFinal = liveGame?.isFinal ?? game.status === "Final";
  const isScored = isLive || isFinal;

  const awayScore = liveGame?.awayScore ?? game.awayScore;
  const homeScore = liveGame?.homeScore ?? game.homeScore;
  const hasScore  = awayScore != null && homeScore != null;
  const awayWins  = hasScore && awayScore! > homeScore!;
  const homeWins  = hasScore && homeScore! > awayScore!;

  const period = liveGame?.periodLabel ?? null;
  const timeLeft = liveGame?.timeRemaining ?? null;

  const statusLine = isLive
    ? `${period ?? "LIVE"}${timeLeft ? ` · ${timeLeft}` : ""}`
    : isFinal ? `Final${period ? ` · ${period}` : ""}`
    : fmtTime(game.gameTime);

  return (
    <div className={`bg-[#1C1C1E] rounded-2xl overflow-hidden border ${
      isLive ? "border-green-500/30" : "border-white/[0.05]"
    }`}>
      {isLive && <div className="h-[2px] bg-gradient-to-r from-green-500 to-emerald-400" />}

      <div className="p-3">
        {/* Status */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />}
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            isLive ? "text-green-400" : "text-[#555]"
          }`}>
            {statusLine}
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-2">
          <TeamLine sport={game.sport} name={game.awayTeam}
            score={awayScore} winning={awayWins} isScored={isScored} />
          <div className="h-px bg-white/[0.04] ml-9" />
          <TeamLine sport={game.sport} name={game.homeTeam}
            score={homeScore} winning={homeWins} isScored={isScored} />
        </div>

        <OddsDrawer game={game} />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-3 border border-white/[0.05] animate-pulse space-y-2">
      <div className="h-2 bg-white/[0.05] rounded w-12" />
      {[0, 1].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-white/[0.08] rounded w-20" />
            <div className="h-2 bg-white/[0.04] rounded w-12" />
          </div>
          <div className="h-5 w-6 bg-white/[0.06] rounded" />
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
    const aLg = findLiveGame(a, liveGames), bLg = findLiveGame(b, liveGames);
    const aL = aLg?.isLive ?? a.status === "InProgress";
    const bL = bLg?.isLive ?? b.status === "InProgress";
    const aF = aLg?.isFinal ?? a.status === "Final";
    const bF = bLg?.isFinal ?? b.status === "Final";
    if (aL && !bL) return -1; if (!aL && bL) return 1;
    if (aF && !bF) return 1;  if (!aF && bF) return -1;
    return 0;
  });

  const liveCount = sortedGames.filter(g => {
    const lg = findLiveGame(g, liveGames);
    return lg?.isLive ?? g.status === "InProgress";
  }).length;

  return (
    <div className="px-3 pt-10 pb-28 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Scores</h1>
          <p className="text-[11px] text-[#555] mt-0.5">
            {lastRefresh
              ? lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "Today's games"}
            {liveCount > 0 && (
              <span className="text-green-400 ml-1.5 inline-flex items-center gap-1">
                · <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {liveCount} live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchGames(sport)} disabled={loading}
            className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/[0.07] flex items-center justify-center disabled:opacity-40">
            <RefreshCw className={`size-3.5 text-[#8E8E93] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={gradeNow} disabled={grading}
            className="h-8 px-3 bg-[#E21111] hover:bg-[#c81010] text-white text-[11px] font-bold rounded-full flex items-center gap-1.5 disabled:opacity-60 transition-colors">
            {grading
              ? <><RefreshCw className="size-3 animate-spin" /> Grading…</>
              : <><CheckCircle className="size-3" /> Grade</>}
          </button>
        </div>
      </div>

      {gradeResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-400 font-medium">
          ✓ Graded {gradeResult.graded} bet{gradeResult.graded !== 1 ? "s" : ""}.
          {gradeResult.skipped > 0 && ` ${gradeResult.skipped} still pending.`}
        </div>
      )}

      {/* Sport pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-1">
        {SPORTS.map(s => (
          <button key={s} onClick={() => setSport(s)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              sport === s ? "bg-[#E21111] text-white" : "bg-[#1C1C1E] text-[#8E8E93] border border-white/[0.06]"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* 2-column grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center">
            <Clock className="size-5 text-[#555]" />
          </div>
          <p className="text-white font-semibold text-sm">No {sport} games today</p>
          <p className="text-[#555] text-xs">Switch leagues above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {sortedGames.map(game => (
            <GameCard key={game.gameId} game={game} liveGame={findLiveGame(game, liveGames)} />
          ))}
        </div>
      )}
    </div>
  );
}

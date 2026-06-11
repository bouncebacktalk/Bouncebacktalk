import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { apiGet, apiPost } from "../api/api";
import { useLiveScores, type LiveGame } from "../bets/useLiveScores";
import type { Bet } from "../bets/bets";

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
function fmtML(n: number | null) { return n == null ? "—" : n > 0 ? `+${n}` : String(n); }
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}

// ── Logo with fallback initials ───────────────────────────────────────────────
function Logo({ sport, name, size = 44 }: { sport: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(sport, name);
  const initials = name.split(" ").slice(-1)[0]?.slice(0, 3).toUpperCase() ?? "?";
  if (!url || err) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-[#2C2C2E] flex items-center justify-center shrink-0"
      >
        <span className="text-[10px] font-black text-[#636366]">{initials}</span>
      </div>
    );
  }
  return (
    <img
      src={url} alt={name}
      style={{ width: size, height: size }}
      className="object-contain shrink-0"
      onError={() => setErr(true)}
    />
  );
}

// ── Odds pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#636366]">{label}</span>
      <span className="text-[12px] font-bold text-white font-mono">{value}</span>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({ game, liveGame, hasBet }: { game: GameOdds; liveGame?: LiveGame | null; hasBet?: boolean }) {
  const [oddsOpen, setOddsOpen] = useState(false);

  const isLive  = liveGame?.isLive  ?? game.status === "InProgress";
  const isFinal = liveGame?.isFinal ?? game.status === "Final";
  const awayScore = liveGame?.awayScore ?? game.awayScore;
  const homeScore = liveGame?.homeScore ?? game.homeScore;
  const hasScore  = awayScore != null && homeScore != null;
  const awayLeads = hasScore && (awayScore! > homeScore!);
  const homeLeads = hasScore && (homeScore! > awayScore!);
  const period    = liveGame?.periodLabel ?? null;
  const timeLeft  = liveGame?.timeRemaining ?? null;

  const hasOdds = game.spread != null || game.homeMoneyline != null || game.overUnder != null;

  // Status
  const statusLabel = isFinal
    ? "Final"
    : isLive ? "Live"
    : fmtTime(game.gameTime);
  const statusColor = isLive ? "text-[#30D158]" : "text-[#636366]";
  // Period line: "Q3", "Top 7th", "OT", etc.
  const periodLine = isLive
    ? [period, timeLeft].filter(Boolean).join("  ·  ") || null
    : isFinal && period ? period : null;

  // Spread display
  const awaySpread = game.spread != null ? (game.spread > 0 ? `+${game.spread}` : String(game.spread)) : null;
  const homeSpread = game.spread != null ? (game.spread > 0 ? `-${game.spread}` : `+${Math.abs(game.spread)}`) : null;

  return (
    <div className={`bg-[#1C1C1E] rounded-2xl overflow-hidden ${isLive ? "ring-1 ring-[#30D158]/25" : ""}`}>
      {/* Live bar */}
      {isLive && <div className="h-[2px] bg-gradient-to-r from-[#30D158] via-[#34C759] to-transparent" />}

      <div className="px-4 pt-3 pb-3">
        {/* Status row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse shrink-0" />}
              <span className={`text-[9px] font-bold uppercase tracking-widest ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            {periodLine && (
              <span className="text-[10px] font-bold text-white bg-[#2C2C2E] px-2 py-0.5 rounded-md tabular-nums">
                {periodLine}
              </span>
            )}
          </div>
          {hasBet && (
            <span className="text-[9px] font-black uppercase tracking-wider text-[#E21111] bg-[#E21111]/10 px-2 py-0.5 rounded-full">
              Your Bet
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-1.5">
          {/* Away */}
          <div className="flex items-center gap-2.5">
            <Logo sport={game.sport} name={game.awayTeam} size={30} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-bold leading-tight truncate ${
                hasScore && !awayLeads ? "text-[#636366]" : "text-white"
              }`}>
                {game.awayTeam.split(" ").slice(-1)[0]}
                {awaySpread && <span className="ml-1.5 text-[9px] font-semibold text-[#48484A]">{awaySpread}</span>}
              </p>
              <p className="text-[10px] text-[#636366] leading-none truncate">
                {game.awayTeam.split(" ").slice(0, -1).join(" ")}
              </p>
            </div>
            {hasScore && (
              <span className={`text-[22px] font-black tabular-nums leading-none ${
                awayLeads ? "text-white" : "text-[#48484A]"
              }`}>
                {awayScore}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] shrink-0" />
            <div className="flex-1 h-px bg-[#2C2C2E]" />
          </div>

          {/* Home */}
          <div className="flex items-center gap-2.5">
            <Logo sport={game.sport} name={game.homeTeam} size={30} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-bold leading-tight truncate ${
                hasScore && !homeLeads ? "text-[#636366]" : "text-white"
              }`}>
                {game.homeTeam.split(" ").slice(-1)[0]}
                {homeSpread && <span className="ml-1.5 text-[9px] font-semibold text-[#48484A]">{homeSpread}</span>}
              </p>
              <p className="text-[10px] text-[#636366] leading-none truncate">
                {game.homeTeam.split(" ").slice(0, -1).join(" ")}
              </p>
            </div>
            {hasScore && (
              <span className={`text-[22px] font-black tabular-nums leading-none ${
                homeLeads ? "text-white" : "text-[#48484A]"
              }`}>
                {homeScore}
              </span>
            )}
          </div>
        </div>

        {/* Odds toggle */}
        {hasOdds && (
          <button
            onClick={() => setOddsOpen(o => !o)}
            className="mt-2 w-full flex items-center justify-between pt-2 border-t border-[#2C2C2E]"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#48484A]">Lines</span>
            {oddsOpen
              ? <ChevronUp className="size-3 text-[#48484A]" />
              : <ChevronDown className="size-3 text-[#48484A]" />
            }
          </button>
        )}

        {/* Odds panel */}
        {hasOdds && oddsOpen && (
          <div className="mt-2 bg-[#141414] rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-4 px-3 py-1.5 border-b border-[#2C2C2E]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#48484A]">Book</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#48484A] text-center">Spread</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#48484A] text-center">O/U</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#48484A] text-right">ML</span>
            </div>
            {/* One row per sportsbook */}
            {(game.sportsbooks.length > 0 ? game.sportsbooks : [{
              sportsbook: "Consensus",
              spread: game.spread,
              overUnder: game.overUnder,
              homeMoneyline: game.homeMoneyline,
              awayMoneyline: game.awayMoneyline,
            }]).map((sb, i) => (
              <div
                key={sb.sportsbook}
                className={`grid grid-cols-4 px-3 py-2 items-center ${i % 2 === 0 ? "bg-transparent" : "bg-[#1A1A1A]"}`}
              >
                <span className="text-[11px] font-bold text-white truncate pr-1">{sb.sportsbook}</span>
                <span className="text-[11px] font-mono text-[#8E8E93] text-center">
                  {sb.spread != null ? (sb.spread > 0 ? `+${sb.spread}` : String(sb.spread)) : "—"}
                </span>
                <span className="text-[11px] font-mono text-[#8E8E93] text-center">
                  {sb.overUnder ?? "—"}
                </span>
                <div className="flex flex-col items-end gap-0">
                  <span className={`text-[10px] font-mono font-bold ${(sb.awayMoneyline ?? 0) > 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                    {fmtML(sb.awayMoneyline)}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${(sb.homeMoneyline ?? 0) > 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                    {fmtML(sb.homeMoneyline)}
                  </span>
                </div>
              </div>
            ))}
            {/* Away / Home label at bottom */}
            <div className="px-3 py-1.5 border-t border-[#2C2C2E] flex justify-end gap-3">
              <span className="text-[8px] text-[#48484A]">↑ {game.awayTeam.split(" ").slice(-1)[0]}</span>
              <span className="text-[8px] text-[#48484A]">↓ {game.homeTeam.split(" ").slice(-1)[0]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-4 animate-pulse space-y-3">
      <div className="h-2.5 w-10 bg-[#2C2C2E] rounded-full" />
      {[0, 1].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2C2C2E] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-[#2C2C2E] rounded w-24" />
            <div className="h-2.5 bg-[#242424] rounded w-16" />
          </div>
          <div className="w-7 h-7 bg-[#2C2C2E] rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Check if a game matches any of the user's pending bet team tokens ─────────
function gameHasBet(game: GameOdds, betTokens: string[]): boolean {
  if (!betTokens.length) return false;
  const haystack = normTeam(game.homeTeam) + normTeam(game.awayTeam);
  return betTokens.some(t => haystack.includes(t));
}

// ── Extract short team tokens from pending bets ───────────────────────────────
function extractBetTokens(bets: Bet[]): string[] {
  const tokens: string[] = [];
  for (const bet of bets) {
    for (const leg of bet.legs) {
      // leg.game = "Thunder vs Pacers", leg.pick = "OKC Thunder -5.5"
      const sources = [leg.game ?? "", leg.pick ?? ""];
      for (const src of sources) {
        // pull last word of each team token (e.g. "Thunder", "Pacers")
        src.split(/\s+vs\.?\s+|\s+@\s+/i).forEach(part => {
          const word = part.trim().split(/\s+/).pop();
          if (word && word.length >= 3) tokens.push(normTeam(word));
        });
      }
    }
  }
  return [...new Set(tokens)];
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function OddsPage() {
  const [sport, setSport] = useState(() => {
    const p = new URLSearchParams(window.location.search).get("sport");
    return p && ["NBA","NFL","MLB","NHL","NCAAF","NCAAB"].includes(p.toUpperCase()) ? p.toUpperCase() : "NBA";
  });
  const [games, setGames] = useState<GameOdds[]>([]);
  const liveGames = useLiveScores();
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeMsg, setGradeMsg] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [betTokens, setBetTokens] = useState<string[]>([]);

  // Fetch pending bets once on mount to know which games to highlight
  useEffect(() => {
    apiGet<Bet[]>("/api/bets")
      .then(data => { if (Array.isArray(data)) setBetTokens(extractBetTokens(data)); })
      .catch(() => {});
  }, []);

  const fetchGames = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const data = await apiGet<GameOdds[]>(`/api/sports/odds?sport=${s}`);
      if (!Array.isArray(data)) { setGames([]); return; }
      const todayStr = new Date().toLocaleDateString("en-CA");
      const todayGames = data.filter(g => {
        try { return new Date(g.gameTime).toLocaleDateString("en-CA") === todayStr; }
        catch { return false; }
      });
      setGames(todayGames);
      setLastRefresh(new Date());
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGames(sport); }, [sport]);

  async function grade() {
    setGrading(true); setGradeMsg(null);
    try {
      const r = await apiPost<{ graded: number; skipped: number }>("/api/sports/grade", {});
      setGradeMsg(`✓ Graded ${r.graded} bet${r.graded !== 1 ? "s" : ""}${r.skipped ? `, ${r.skipped} pending` : ""}`);
    } catch { setGradeMsg("Grading failed"); }
    finally { setGrading(false); }
  }

  const sorted = [...games].sort((a, b) => {
    const aLg = findLiveGame(a, liveGames), bLg = findLiveGame(b, liveGames);
    const aL = aLg?.isLive  ?? a.status === "InProgress";
    const bL = bLg?.isLive  ?? b.status === "InProgress";
    const aF = aLg?.isFinal ?? a.status === "Final";
    const bF = bLg?.isFinal ?? b.status === "Final";
    // 1. Live games always first
    if (aL && !bL) return -1; if (!aL && bL) return 1;
    // 2. Among live: bet games first
    if (aL && bL) {
      const aBet = gameHasBet(a, betTokens) ? 1 : 0;
      const bBet = gameHasBet(b, betTokens) ? 1 : 0;
      if (aBet !== bBet) return bBet - aBet;
    }
    // 3. Scheduled games: chronological by game time
    if (!aL && !aF && !bL && !bF) {
      return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
    }
    // 4. Final games last
    if (aF && !bF) return 1; if (!aF && bF) return -1;
    return 0;
  });

  const liveCount = sorted.filter(g => {
    const lg = findLiveGame(g, liveGames);
    return lg?.isLive ?? g.status === "InProgress";
  }).length;

  return (
    <div className="px-4 pt-10 pb-28 space-y-4">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-black text-white tracking-tight leading-none">Scores</h1>
          <p className="text-[12px] text-[#636366] mt-1">
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
              : "Today's matchups"}
            {liveCount > 0 && (
              <span className="text-[#30D158] ml-2">
                · {liveCount} live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchGames(sport)} disabled={loading}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 text-[#8E8E93] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={grade} disabled={grading}
            className="h-9 px-3.5 rounded-full bg-[#E21111] text-white text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {grading
              ? <RefreshCw className="size-3 animate-spin" />
              : <CheckCircle className="size-3" />}
            Grade
          </button>
        </div>
      </div>

      {/* Grade result */}
      {gradeMsg && (
        <div className="bg-[#1C3A24] border border-[#30D158]/20 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#30D158]">
          {gradeMsg}
        </div>
      )}

      {/* Sport pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {SPORTS.map(s => (
          <button
            key={s} onClick={() => setSport(s)}
            className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
              sport === s
                ? "bg-[#E21111] text-white shadow-lg shadow-[#E21111]/20"
                : "bg-[#1C1C1E] text-[#8E8E93]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Game list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1C1C1E] flex items-center justify-center">
            <Clock className="size-6 text-[#48484A]" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-[15px]">No {sport} games today</p>
            <p className="text-[#636366] text-[13px] mt-1">Check back later or try another league</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(game => (
            <GameCard
              key={game.gameId}
              game={game}
              liveGame={findLiveGame(game, liveGames)}
              hasBet={gameHasBet(game, betTokens)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

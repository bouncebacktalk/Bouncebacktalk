import { Injectable, Logger } from '@nestjs/common';

// ─── API keys (read at runtime so they survive nixos-rebuild without rebuild) ──
const NBA_KEY = () => process.env.NBA_API_KEY ?? process.env.SPORTSDATA_API_KEY ?? '';
const MLB_KEY = () => process.env.MLB_API_KEY ?? process.env.SPORTSDATA_MLB_KEY ?? process.env.SPORTSDATA_API_KEY ?? '';
const ODDS_API_KEY = process.env.ODDS_API_KEY ?? '';

const SPORTSDATA_BASE = 'https://api.sportsdata.io/v3';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// ─── Supported sports (live scores enabled) ────────────────────────────────────
export const SUPPORTED_SPORTS = new Set(['NBA', 'MLB']);
export const UNSUPPORTED_SPORTS = new Set(['NFL', 'NHL', 'NCAAF', 'NCAAB']);

// ─── The Odds API sport keys (for odds page) ───────────────────────────────────
const ODDS_API_SPORT: Record<string, string> = {
  NBA: 'basketball_nba',
  MLB: 'baseball_mlb',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LiveGame {
  gameId: string;
  sport: 'NBA' | 'MLB';
  /** Full name e.g. "Golden State Warriors" */
  homeTeam: string;
  awayTeam: string;
  /** Abbreviation e.g. "GSW" */
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  /** SportsData.io status: Scheduled | InProgress | Halftime | Final | F/OT | Postponed … */
  status: string;
  isLive: boolean;
  isFinal: boolean;
  /**
   * For NBA: quarter number as string ("1"–"4", "OT")
   * For MLB: inning number as string ("1"–"9"+)
   */
  period: string | null;
  /**
   * Human-readable period label.
   * NBA: "Q3", "OT", "Half"
   * MLB: "Top 4th", "Bot 7th"
   */
  periodLabel: string | null;
  /** NBA only — time left in the quarter e.g. "4:32" */
  timeRemaining: string | null;
  /** ISO datetime of tip-off / first pitch */
  gameTime: string;
}

/** Kept for backward-compat with grading service */
export interface GameScore {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  quarter?: string | null;
  timeRemaining?: string | null;
  gameTime: string;
}

/** Used by the odds page */
export interface GameOdds {
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
  sportsbooks: SportsbookLine[];
}

export interface SportsbookLine {
  sportsbook: string;
  spread: number | null;
  overUnder: number | null;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SportsDataService {
  private readonly logger = new Logger(SportsDataService.name);

  // Per-sport 60-second in-memory cache
  private _liveCache = new Map<string, { ts: number; data: LiveGame[] }>();

  // ── HTTP helper ──────────────────────────────────────────────────────────────

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) {
        this.logger.warn(`API ${res.status} for ${url.replace(/key=[^&]+/, 'key=***')}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.error(`Fetch error: ${err?.message}`);
      return null;
    }
  }

  // ── NBA ──────────────────────────────────────────────────────────────────────

  private async fetchNBA(date: string): Promise<LiveGame[]> {
    const url = `${SPORTSDATA_BASE}/nba/scores/json/GamesByDate/${date}?key=${NBA_KEY()}`;
    const raw = await this.fetchJson<any[]>(url);
    if (!Array.isArray(raw)) return [];
    return raw.map((g) => this.normalizeNBA(g));
  }

  private normalizeNBA(g: any): LiveGame {
    const status: string = g.Status ?? 'Scheduled';
    const isLive = status === 'InProgress' || status === 'Halftime';
    const isFinal = status === 'Final' || status.startsWith('F/');

    const quarter = g.Quarter != null ? String(g.Quarter) : null;
    let periodLabel: string | null = null;
    let timeRemaining: string | null = null;

    if (status === 'Halftime') {
      periodLabel = 'Half';
    } else if (quarter) {
      const q = parseInt(quarter, 10);
      periodLabel = q > 4 ? 'OT' : `Q${quarter}`;
      if (g.TimeRemainingMinutes != null) {
        const mins = g.TimeRemainingMinutes;
        const secs = String(g.TimeRemainingSeconds ?? 0).padStart(2, '0');
        timeRemaining = `${mins}:${secs}`;
      }
    }

    return {
      gameId: String(g.GameId ?? ''),
      sport: 'NBA',
      homeTeam: g.HomeTeamName ?? g.HomeTeam ?? '',
      awayTeam: g.AwayTeamName ?? g.AwayTeam ?? '',
      homeTeamCode: g.HomeTeam ?? '',
      awayTeamCode: g.AwayTeam ?? '',
      homeScore: g.HomeScore ?? null,
      awayScore: g.AwayScore ?? null,
      status,
      isLive,
      isFinal,
      period: quarter,
      periodLabel,
      timeRemaining,
      gameTime: g.DateTime ?? g.Day ?? '',
    };
  }

  // ── MLB ──────────────────────────────────────────────────────────────────────

  private async fetchMLB(date: string): Promise<LiveGame[]> {
    const url = `${SPORTSDATA_BASE}/mlb/scores/json/GamesByDate/${date}?key=${MLB_KEY()}`;
    const raw = await this.fetchJson<any[]>(url);
    if (!Array.isArray(raw)) return [];
    return raw.map((g) => this.normalizeMLB(g));
  }

  private normalizeMLB(g: any): LiveGame {
    const status: string = g.Status ?? 'Scheduled';
    const isLive = status === 'InProgress';
    const isFinal = status === 'Final' || status.startsWith('F/');

    const inning = g.Inning != null ? String(g.Inning) : null;
    const inningHalf: string | null = g.InningHalf ?? null; // "T" | "B"

    let periodLabel: string | null = null;
    if (inning) {
      const half = inningHalf === 'T' ? 'Top' : inningHalf === 'B' ? 'Bot' : '';
      const ord = ordinal(parseInt(inning, 10));
      periodLabel = half ? `${half} ${ord}` : ord;
    }

    return {
      gameId: String(g.GameId ?? ''),
      sport: 'MLB',
      homeTeam: g.HomeTeamName ?? g.HomeTeam ?? '',
      awayTeam: g.AwayTeamName ?? g.AwayTeam ?? '',
      homeTeamCode: g.HomeTeam ?? '',
      awayTeamCode: g.AwayTeam ?? '',
      homeScore: g.HomeTeamRuns ?? g.HomeScore ?? null,
      awayScore: g.AwayTeamRuns ?? g.AwayScore ?? null,
      status,
      isLive,
      isFinal,
      period: inning,
      periodLabel,
      timeRemaining: null,
      gameTime: g.DateTime ?? g.Day ?? '',
    };
  }

  // ── Public: live scores ───────────────────────────────────────────────────────

  /** Fetch one sport's live games, using the 60s per-sport cache. */
  async getLiveGamesBySport(sport: 'NBA' | 'MLB', date?: string): Promise<LiveGame[]> {
    const d = date ?? today();
    const key = `${sport}:${d}`;
    const cached = this._liveCache.get(key);
    if (cached && Date.now() - cached.ts < 60_000) return cached.data;

    let data: LiveGame[] = [];
    if (sport === 'NBA') data = await this.fetchNBA(d);
    else if (sport === 'MLB') data = await this.fetchMLB(d);

    this._liveCache.set(key, { ts: Date.now(), data });
    return data;
  }

  /** All supported sports (NBA + MLB) today, 60s cached. */
  async getAllLiveGamesToday(date?: string): Promise<LiveGame[]> {
    const [nba, mlb] = await Promise.all([
      this.getLiveGamesBySport('NBA', date),
      this.getLiveGamesBySport('MLB', date),
    ]);
    return [...nba, ...mlb];
  }

  // ── Public: odds (for odds page) ─────────────────────────────────────────────

  async getOddsByDate(sport: string, _date?: string): Promise<GameOdds[]> {
    const sportKey = ODDS_API_SPORT[sport.toUpperCase()];
    if (!sportKey) return [];

    // Fetch odds + scores in parallel — same API key, same game IDs
    const oddsUrl   = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;
    const scoresUrl = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=1&dateFormat=iso`;

    const [rawOdds, rawScores] = await Promise.all([
      this.fetchJson<any[]>(oddsUrl),
      this.fetchJson<any[]>(scoresUrl),
    ]);

    if (!Array.isArray(rawOdds) || rawOdds.length === 0) return this._oddsFallback(sport);

    // Build a score lookup map: game id → { homeScore, awayScore, completed, lastUpdate }
    const scoreMap = new Map<string, { homeScore: number | null; awayScore: number | null; completed: boolean }>();
    for (const s of (rawScores ?? [])) {
      if (!s.id) continue;
      const homeEntry = (s.scores ?? []).find((sc: any) => sc.name === s.home_team);
      const awayEntry = (s.scores ?? []).find((sc: any) => sc.name === s.away_team);
      scoreMap.set(s.id, {
        homeScore: homeEntry ? Number(homeEntry.score) : null,
        awayScore: awayEntry ? Number(awayEntry.score) : null,
        completed: !!s.completed,
      });
    }

    return rawOdds.map((g) => this._normalizeOddsApiGame(g, sport, scoreMap));
  }

  async getAllOddsToday(): Promise<{ sport: string; games: GameOdds[] }[]> {
    const results = await Promise.all(
      Object.keys(ODDS_API_SPORT).map(async (sport) => ({
        sport,
        games: await this.getOddsByDate(sport),
      })),
    );
    return results.filter((r) => r.games.length > 0);
  }

  private async _oddsFallback(sport: string): Promise<GameOdds[]> {
    // Use live games as fallback (scores only, no lines)
    const upper = sport.toUpperCase() as 'NBA' | 'MLB';
    if (!SUPPORTED_SPORTS.has(upper)) return [];
    const games = await this.getLiveGamesBySport(upper);
    return games.map((g) => ({
      gameId: g.gameId,
      sport: g.sport,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      gameTime: g.gameTime,
      status: g.status,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      spread: null,
      overUnder: null,
      homeMoneyline: null,
      awayMoneyline: null,
      sportsbooks: [],
    }));
  }

  private _normalizeOddsApiGame(
    g: any,
    sport: string,
    scoreMap: Map<string, { homeScore: number | null; awayScore: number | null; completed: boolean }> = new Map(),
  ): GameOdds {
    const sportsbooks: SportsbookLine[] = [];
    const PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'espnbet', 'betonlineag'];
    let spread: number | null = null;
    let overUnder: number | null = null;
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    for (const bm of g.bookmakers ?? []) {
      let sbSpread: number | null = null;
      let sbTotal: number | null = null;
      let sbHome: number | null = null;
      let sbAway: number | null = null;
      for (const market of bm.markets ?? []) {
        if (market.key === 'h2h') {
          for (const o of market.outcomes ?? []) {
            if (o.name === g.home_team) sbHome = o.price;
            else sbAway = o.price;
          }
        } else if (market.key === 'spreads') {
          for (const o of market.outcomes ?? []) {
            if (o.name === g.home_team) sbSpread = o.point;
          }
        } else if (market.key === 'totals') {
          if (market.outcomes?.[0]) sbTotal = market.outcomes[0].point;
        }
      }
      sportsbooks.push({ sportsbook: bm.title ?? bm.key, spread: sbSpread, overUnder: sbTotal, homeMoneyline: sbHome, awayMoneyline: sbAway });
      if (homeMoneyline == null && PRIORITY.includes(bm.key)) {
        spread = sbSpread; overUnder = sbTotal; homeMoneyline = sbHome; awayMoneyline = sbAway;
      }
    }
    if (homeMoneyline == null && sportsbooks.length > 0) {
      const f = sportsbooks[0];
      spread = f.spread; overUnder = f.overUnder; homeMoneyline = f.homeMoneyline; awayMoneyline = f.awayMoneyline;
    }
    const score = scoreMap.get(g.id ?? '');
    const commenced = g.commence_time && new Date(g.commence_time) < new Date();
    const status = score?.completed
      ? 'Final'
      : commenced
      ? 'InProgress'
      : 'Scheduled';

    return {
      gameId: g.id ?? '',
      sport,
      homeTeam: g.home_team ?? '',
      awayTeam: g.away_team ?? '',
      gameTime: g.commence_time ?? '',
      status,
      homeScore: score?.homeScore ?? null,
      awayScore: score?.awayScore ?? null,
      spread, overUnder, homeMoneyline, awayMoneyline, sportsbooks,
    };
  }

  // ── Public: grading (GameScore compat) ───────────────────────────────────────

  async getScoresByDate(sport: string, date?: string): Promise<GameScore[]> {
    const upper = sport.toUpperCase() as 'NBA' | 'MLB';
    if (!SUPPORTED_SPORTS.has(upper)) return [];
    const games = await this.getLiveGamesBySport(upper, date);
    return games.map((g) => ({
      gameId: g.gameId,
      sport: g.sport,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      status: g.status,
      quarter: g.period,
      timeRemaining: g.timeRemaining,
      gameTime: g.gameTime,
    }));
  }

  async getGameScore(sport: string, gameId: string): Promise<GameScore | null> {
    const scores = await this.getScoresByDate(sport);
    return scores.find((s) => s.gameId === gameId) ?? null;
  }

  // kept for backward-compat; now just NBA+MLB
  async getAllScoresToday(): Promise<GameScore[]> {
    const games = await this.getAllLiveGamesToday();
    return games.map((g) => ({
      gameId: g.gameId, sport: g.sport,
      homeTeam: g.homeTeam, awayTeam: g.awayTeam,
      homeScore: g.homeScore, awayScore: g.awayScore,
      status: g.status, quarter: g.period,
      timeRemaining: g.timeRemaining, gameTime: g.gameTime,
    }));
  }
}

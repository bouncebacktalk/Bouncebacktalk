import { Injectable, Logger } from '@nestjs/common';

const SPORTSDATA_KEY = process.env.SPORTSDATA_API_KEY ?? '';
// Sport-specific overrides — add more as you get each sport's key
const SPORTSDATA_KEYS: Record<string, string> = {
  MLB: process.env.SPORTSDATA_MLB_KEY ?? SPORTSDATA_KEY,
};
function sdKey(sport: string): string {
  return SPORTSDATA_KEYS[sport.toUpperCase()] ?? SPORTSDATA_KEY;
}
const ODDS_API_KEY   = process.env.ODDS_API_KEY ?? '';
const SPORTSDATA_BASE = 'https://api.sportsdata.io/v3';
const ODDS_API_BASE   = 'https://api.the-odds-api.com/v4';

// The Odds API sport keys
const ODDS_API_SPORT: Record<string, string> = {
  NBA:   'basketball_nba',
  NFL:   'americanfootball_nfl',
  MLB:   'baseball_mlb',
  NHL:   'icehockey_nhl',
  NCAAF: 'americanfootball_ncaaf',
  NCAAB: 'basketball_ncaab',
};

// SportsData.io scores endpoints (still used for grading)
const SCORES_CONFIG: Record<string, { league: string; scoresPath: string }> = {
  NBA:   { league: 'nba', scoresPath: 'scores/json/GamesByDate' },
  NFL:   { league: 'nfl', scoresPath: 'scores/json/ScoresByDate' },
  MLB:   { league: 'mlb', scoresPath: 'scores/json/GamesByDate' },
  NHL:   { league: 'nhl', scoresPath: 'scores/json/GamesByDate' },
  NCAAF: { league: 'cfb', scoresPath: 'scores/json/GamesByDate' },
  NCAAB: { league: 'cbb', scoresPath: 'scores/json/GamesByDate' },
};

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

@Injectable()
export class SportsDataService {
  private readonly logger = new Logger(SportsDataService.name);

  private async fetch<T>(url: string): Promise<T | null> {
    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) {
        this.logger.warn(`API ${res.status} for ${url}`);
        return null;
      }
      return await res.json() as T;
    } catch (err: any) {
      this.logger.error(`Fetch error: ${err?.message}`);
      return null;
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Get today's odds from The Odds API */
  async getOddsByDate(sport: string, _date?: string): Promise<GameOdds[]> {
    const sportKey = ODDS_API_SPORT[sport.toUpperCase()];
    if (!sportKey) return [];

    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;
    const raw = await this.fetch<any[]>(url);

    if (!Array.isArray(raw)) {
      this.logger.warn(`The Odds API returned non-array for ${sport}, falling back to scores`);
      return this.getScoresFallback(sport);
    }

    if (raw.length === 0) {
      // No upcoming games from odds API — try scores for today's results
      return this.getScoresFallback(sport);
    }

    return raw.map((g: any) => this.normalizeOddsApiGame(g, sport));
  }

  /** Fallback: scores only (no lines) */
  private async getScoresFallback(sport: string): Promise<GameOdds[]> {
    const cfg = SCORES_CONFIG[sport.toUpperCase()];
    if (!cfg) return [];
    const d = this.today();
    const url = `${SPORTSDATA_BASE}/${cfg.league}/${cfg.scoresPath}/${d}?key=${sdKey(sport)}`;
    const raw = await this.fetch<any[]>(url);
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({
      gameId: String(g.GameId ?? g.ScoreId ?? g.GameKey ?? ''),
      sport,
      homeTeam: g.HomeTeam ?? '',
      awayTeam: g.AwayTeam ?? '',
      gameTime: g.DateTime ?? g.GameDateTime ?? g.Day ?? '',
      status: g.Status ?? 'Scheduled',
      homeScore: g.HomeScore ?? null,
      awayScore: g.AwayScore ?? null,
      spread: null,
      overUnder: null,
      homeMoneyline: null,
      awayMoneyline: null,
      sportsbooks: [],
    }));
  }

  private normalizeOddsApiGame(g: any, sport: string): GameOdds {
    const sportsbooks: SportsbookLine[] = [];
    let spread: number | null = null;
    let overUnder: number | null = null;
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    // Priority order for consensus line
    const PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'espnbet', 'betonlineag'];

    for (const bm of (g.bookmakers ?? [])) {
      const sbName = bm.title ?? bm.key ?? '';
      let sbSpread: number | null = null;
      let sbTotal: number | null = null;
      let sbHomeMl: number | null = null;
      let sbAwayMl: number | null = null;

      for (const market of (bm.markets ?? [])) {
        if (market.key === 'h2h') {
          for (const outcome of (market.outcomes ?? [])) {
            if (outcome.name === g.home_team) sbHomeMl = outcome.price;
            else sbAwayMl = outcome.price;
          }
        } else if (market.key === 'spreads') {
          for (const outcome of (market.outcomes ?? [])) {
            if (outcome.name === g.home_team) sbSpread = outcome.point;
          }
        } else if (market.key === 'totals') {
          if (market.outcomes?.[0]) sbTotal = market.outcomes[0].point;
        }
      }

      sportsbooks.push({ sportsbook: sbName, spread: sbSpread, overUnder: sbTotal, homeMoneyline: sbHomeMl, awayMoneyline: sbAwayMl });

      // Use first priority book for consensus
      if (homeMoneyline == null && PRIORITY.includes(bm.key)) {
        spread = sbSpread;
        overUnder = sbTotal;
        homeMoneyline = sbHomeMl;
        awayMoneyline = sbAwayMl;
      }
    }

    // Fallback: first bookmaker
    if (homeMoneyline == null && sportsbooks.length > 0) {
      const first = sportsbooks[0];
      spread = first.spread;
      overUnder = first.overUnder;
      homeMoneyline = first.homeMoneyline;
      awayMoneyline = first.awayMoneyline;
    }

    const isLive = g.commence_time && new Date(g.commence_time) < new Date();

    return {
      gameId: g.id ?? '',
      sport,
      homeTeam: g.home_team ?? '',
      awayTeam: g.away_team ?? '',
      gameTime: g.commence_time ?? '',
      status: isLive ? 'InProgress' : 'Scheduled',
      homeScore: null,
      awayScore: null,
      spread,
      overUnder,
      homeMoneyline,
      awayMoneyline,
      sportsbooks,
    };
  }

  /** Get today's scores for grading */
  async getScoresByDate(sport: string, date?: string): Promise<GameScore[]> {
    const cfg = SCORES_CONFIG[sport.toUpperCase()];
    if (!cfg) return [];
    const d = date ?? this.today();
    const url = `${SPORTSDATA_BASE}/${cfg.league}/${cfg.scoresPath}/${d}?key=${sdKey(sport)}`;
    const raw = await this.fetch<any[]>(url);
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({
      gameId: String(g.GameId ?? g.ScoreId ?? g.GameKey ?? ''),
      sport,
      homeTeam: g.HomeTeam ?? g.HomeTeamName ?? '',
      awayTeam: g.AwayTeam ?? g.AwayTeamName ?? '',
      homeScore: g.HomeScore ?? g.HomeTeamScore ?? null,
      awayScore: g.AwayScore ?? g.AwayTeamScore ?? null,
      status: g.Status ?? 'Scheduled',
      quarter: g.Quarter ?? g.Period ?? null,
      timeRemaining: g.TimeRemainingMinutes != null
        ? `${g.TimeRemainingMinutes}:${String(g.TimeRemainingSeconds ?? 0).padStart(2, '0')}`
        : null,
      gameTime: g.DateTime ?? g.GameDateTime ?? g.Day ?? '',
    }));
  }

  /** Get all active sports today */
  async getAllOddsToday(): Promise<{ sport: string; games: GameOdds[] }[]> {
    const sports = Object.keys(ODDS_API_SPORT);
    const results = await Promise.all(
      sports.map(async (sport) => ({
        sport,
        games: await this.getOddsByDate(sport),
      }))
    );
    return results.filter((r) => r.games.length > 0);
  }

  // Simple 60-second in-memory cache for live scores
  private _liveScoresCache: { ts: number; data: GameScore[] } | null = null;

  /** All sports live scores today — cached 60s */
  async getAllScoresToday(): Promise<GameScore[]> {
    const now = Date.now();
    if (this._liveScoresCache && now - this._liveScoresCache.ts < 60_000) {
      return this._liveScoresCache.data;
    }
    const sports = Object.keys(SCORES_CONFIG);
    const results = await Promise.all(sports.map((s) => this.getScoresByDate(s)));
    const data = results.flat();
    this._liveScoresCache = { ts: now, data };
    return data;
  }

  /** Get a single game score by gameId */
  async getGameScore(sport: string, gameId: string): Promise<GameScore | null> {
    const scores = await this.getScoresByDate(sport);
    return scores.find((s) => s.gameId === gameId) ?? null;
  }
}

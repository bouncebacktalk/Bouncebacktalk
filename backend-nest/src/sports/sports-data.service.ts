import { Injectable, Logger } from '@nestjs/common';

const API_KEY = process.env.SPORTSDATA_API_KEY ?? '';
const BASE = 'https://api.sportsdata.io/v3';

export interface GameOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;          // ISO string
  status: string;            // 'Scheduled' | 'InProgress' | 'Final'
  homeScore: number | null;
  awayScore: number | null;
  spread: number | null;     // home spread e.g. -5.5
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

// Map our sport keys to SportsData.io endpoints
const SPORT_CONFIG: Record<string, { league: string; scoresPath: string; oddsPath: string }> = {
  NBA:  { league: 'nba',    scoresPath: 'scores/json/GamesByDate',    oddsPath: 'odds/json/GameOddsByDate' },
  NFL:  { league: 'nfl',    scoresPath: 'scores/json/ScoresByDate',   oddsPath: 'odds/json/GameOddsByDate' },
  MLB:  { league: 'mlb',    scoresPath: 'scores/json/GamesByDate',    oddsPath: 'odds/json/GameOddsByDate' },
  NHL:  { league: 'nhl',    scoresPath: 'scores/json/GamesByDate',    oddsPath: 'odds/json/GameOddsByDate' },
  NCAAF:{ league: 'cfb',    scoresPath: 'scores/json/GamesByDate',    oddsPath: 'odds/json/GameOddsByDate' },
  NCAAB:{ league: 'cbb',    scoresPath: 'scores/json/GamesByDate',    oddsPath: 'odds/json/GameOddsByDate' },
};

@Injectable()
export class SportsDataService {
  private readonly logger = new Logger(SportsDataService.name);

  private async fetch<T>(url: string): Promise<T | null> {
    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) {
        this.logger.warn(`SportsData API ${res.status} for ${url}`);
        return null;
      }
      return await res.json() as T;
    } catch (err: any) {
      this.logger.error(`SportsData fetch error: ${err?.message}`);
      return null;
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Get today's games with odds for a given sport.
   *  If the odds endpoint is unauthorized (plan doesn't include it),
   *  automatically falls back to the scores endpoint so games still appear. */
  async getOddsByDate(sport: string, date?: string): Promise<GameOdds[]> {
    const cfg = SPORT_CONFIG[sport.toUpperCase()];
    if (!cfg) return [];
    const d = date ?? this.today();

    // Try odds endpoint first
    const oddsUrl = `${BASE}/${cfg.league}/${cfg.oddsPath}/${d}?key=${API_KEY}`;
    const oddsRaw = await this.fetch<any>(oddsUrl);

    // If we got a valid array back, use it
    if (Array.isArray(oddsRaw) && oddsRaw.length >= 0) {
      return oddsRaw.map((g: any) => this.normalizeOdds(g, sport));
    }

    // Odds endpoint unauthorized or failed — fall back to scores
    this.logger.warn(`Odds endpoint unavailable for ${sport}, falling back to scores`);
    const scoresUrl = `${BASE}/${cfg.league}/${cfg.scoresPath}/${d}?key=${API_KEY}`;
    const scoresRaw = await this.fetch<any[]>(scoresUrl);
    if (!Array.isArray(scoresRaw)) return [];

    // Return games with null odds fields so the UI still renders them
    return scoresRaw.map((g: any) => ({
      gameId: String(g.GameId ?? g.ScoreId ?? g.GameKey ?? ''),
      sport,
      homeTeam: g.HomeTeam ?? g.HomeTeamName ?? '',
      awayTeam: g.AwayTeam ?? g.AwayTeamName ?? '',
      gameTime: g.DateTime ?? g.GameDateTime ?? g.Day ?? '',
      status: g.Status ?? 'Scheduled',
      homeScore: g.HomeScore ?? g.HomeTeamScore ?? null,
      awayScore: g.AwayScore ?? g.AwayTeamScore ?? null,
      spread: null,
      overUnder: null,
      homeMoneyline: null,
      awayMoneyline: null,
      sportsbooks: [],
    }));
  }

  /** Get today's scores for a given sport */
  async getScoresByDate(sport: string, date?: string): Promise<GameScore[]> {
    const cfg = SPORT_CONFIG[sport.toUpperCase()];
    if (!cfg) return [];
    const d = date ?? this.today();
    const url = `${BASE}/${cfg.league}/${cfg.scoresPath}/${d}?key=${API_KEY}`;
    const raw = await this.fetch<any[]>(url);
    if (!raw) return [];
    return raw.map((g: any) => this.normalizeScore(g, sport));
  }

  /** Get all active sports today */
  async getAllOddsToday(): Promise<{ sport: string; games: GameOdds[] }[]> {
    const sports = Object.keys(SPORT_CONFIG);
    const results = await Promise.all(
      sports.map(async (sport) => ({
        sport,
        games: await this.getOddsByDate(sport),
      }))
    );
    return results.filter((r) => r.games.length > 0);
  }

  /** Get a single game's current score by gameId and sport */
  async getGameScore(sport: string, gameId: string): Promise<GameScore | null> {
    const scores = await this.getScoresByDate(sport);
    return scores.find((s) => s.gameId === gameId) ?? null;
  }

  private normalizeOdds(g: any, sport: string): GameOdds {
    // Collect sportsbook lines
    const sportsbooks: SportsbookLine[] = [];
    const sbookMap: Record<string, SportsbookLine> = {};

    const pushLineItem = (item: any) => {
      const name = item.SportsbookId || item.Sportsbook || 'Unknown';
      if (!sbookMap[name]) {
        sbookMap[name] = { sportsbook: name, spread: null, overUnder: null, homeMoneyline: null, awayMoneyline: null };
      }
      const e = sbookMap[name];
      if (item.PregameOdds) {
        item.PregameOdds.forEach((o: any) => {
          if (o.HomePointSpread != null) e.spread = o.HomePointSpread;
          if (o.OverUnder != null) e.overUnder = o.OverUnder;
          if (o.HomeMoneyLine != null) e.homeMoneyline = o.HomeMoneyLine;
          if (o.AwayMoneyLine != null) e.awayMoneyline = o.AwayMoneyLine;
        });
      }
      // flat fields
      if (item.HomePointSpread != null) e.spread = item.HomePointSpread;
      if (item.OverUnder != null) e.overUnder = item.OverUnder;
      if (item.HomeMoneyLine != null) e.homeMoneyline = item.HomeMoneyLine;
      if (item.AwayMoneyLine != null) e.awayMoneyline = item.AwayMoneyLine;
    };

    if (Array.isArray(g.PregameOddsByAvailableSportsbook)) {
      g.PregameOddsByAvailableSportsbook.forEach(pushLineItem);
    }
    if (Array.isArray(g.SportsbookOdds)) {
      g.SportsbookOdds.forEach(pushLineItem);
    }

    Object.values(sbookMap).forEach((s) => sportsbooks.push(s));

    // Consensus line fallback
    const consensus = sportsbooks[0] ?? {};

    return {
      gameId: String(g.GameId ?? g.ScoreId ?? g.GameKey ?? ''),
      sport,
      homeTeam: g.HomeTeam ?? g.HomeTeamName ?? '',
      awayTeam: g.AwayTeam ?? g.AwayTeamName ?? '',
      gameTime: g.DateTime ?? g.GameDateTime ?? g.Day ?? '',
      status: g.Status ?? 'Scheduled',
      homeScore: g.HomeScore ?? g.HomeTeamScore ?? null,
      awayScore: g.AwayScore ?? g.AwayTeamScore ?? null,
      spread: g.PointSpread ?? consensus.spread ?? null,
      overUnder: g.OverUnder ?? consensus.overUnder ?? null,
      homeMoneyline: g.HomeMoneyLine ?? consensus.homeMoneyline ?? null,
      awayMoneyline: g.AwayMoneyLine ?? consensus.awayMoneyline ?? null,
      sportsbooks,
    };
  }

  private normalizeScore(g: any, sport: string): GameScore {
    return {
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
    };
  }
}

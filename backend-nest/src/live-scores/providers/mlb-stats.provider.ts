import { Logger } from '@nestjs/common';
import type { LiveGame, LiveScoreProvider, GameState } from '../live-score.types';

const BASE = 'https://statsapi.mlb.com/api/v1';

// Abbreviation map — MLB Stats API doesn't include team codes in schedule endpoint
const TEAM_CODES: Record<number, string> = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC',  119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD',  136: 'SEA', 137: 'SF',  138: 'STL',
  139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function toGameState(status: any): GameState {
  const abstract: string = status?.abstractGameState ?? '';
  const coded: string   = status?.codedGameState ?? '';
  const detailed: string = status?.detailedState ?? '';

  if (abstract === 'Live' || coded === 'I' || detailed === 'In Progress') return 'live';
  if (detailed === 'Warmup') return 'warmup';
  if (abstract === 'Final' || coded === 'F' || coded === 'O') return 'final';
  if (detailed === 'Postponed') return 'postponed';
  if (detailed === 'Suspended') return 'suspended';
  if (detailed === 'Cancelled' || detailed === 'Canceled') return 'cancelled';
  return 'scheduled';
}

function parseGame(g: any): LiveGame {
  const state = toGameState(g.status);
  const isLive  = state === 'live' || state === 'warmup';
  const isFinal = state === 'final';

  const homeId: number = g.teams?.home?.team?.id ?? 0;
  const awayId: number = g.teams?.away?.team?.id ?? 0;
  const homeName: string = g.teams?.home?.team?.name ?? 'Home';
  const awayName: string = g.teams?.away?.team?.name ?? 'Away';
  const homeCode = TEAM_CODES[homeId] ?? homeName.split(' ').pop()?.toUpperCase().slice(0, 3) ?? 'HOM';
  const awayCode = TEAM_CODES[awayId] ?? awayName.split(' ').pop()?.toUpperCase().slice(0, 3) ?? 'AWY';

  const homeScore: number | null = g.teams?.home?.score ?? null;
  const awayScore: number | null = g.teams?.away?.score ?? null;

  const homeW = g.teams?.home?.leagueRecord?.wins;
  const homeL = g.teams?.home?.leagueRecord?.losses;
  const awayW = g.teams?.away?.leagueRecord?.wins;
  const awayL = g.teams?.away?.leagueRecord?.losses;

  // Linescore — present when ?hydrate=linescore
  const ls = g.linescore;
  let periodLabel: string | null = null;
  if (state === 'warmup') {
    periodLabel = 'Warmup';
  } else if (isLive && ls) {
    const inning: number = ls.currentInning ?? 0;
    const half: string   = ls.inningHalf ?? ''; // "Top" | "Bottom"
    if (inning > 0) {
      const halfShort = half === 'Bottom' ? 'Bot' : half === 'Top' ? 'Top' : '';
      periodLabel = `${halfShort} ${ordinal(inning)}`.trim();
    }
  } else if (isFinal) {
    const innings = ls?.innings?.length ?? 9;
    periodLabel = innings > 9 ? `F/${innings}` : 'Final';
  }

  const statusText = g.status?.detailedState ?? (isLive ? 'Live' : isFinal ? 'Final' : 'Scheduled');

  return {
    id: String(g.gamePk),
    sport: 'MLB',
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeScore,
    awayScore,
    state,
    isLive,
    isFinal,
    periodLabel,
    timeRemaining: null, // MLB has no clock
    homeRecord: homeW != null ? `${homeW}-${homeL}` : null,
    awayRecord:  awayW != null ? `${awayW}-${awayL}` : null,
    gameTime: g.gameDate ?? '',
    statusText,
  };
}

export class MlbStatsProvider implements LiveScoreProvider {
  readonly sport = 'MLB' as const;
  private readonly logger = new Logger(MlbStatsProvider.name);

  async fetchGames(date: string): Promise<LiveGame[]> {
    const url = `${BASE}/schedule?sportId=1&date=${date}&hydrate=linescore`;
    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) {
        this.logger.warn(`MLB Stats API ${res.status} for ${date}`);
        return [];
      }
      const json = await res.json() as any;
      const games: any[] = json.dates?.[0]?.games ?? [];
      return games.map(parseGame);
    } catch (err: any) {
      this.logger.error(`MLB Stats fetch error: ${err?.message}`);
      return [];
    }
  }
}

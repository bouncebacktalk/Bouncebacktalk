import { Logger } from '@nestjs/common';
import type { LiveGame, LiveScoreProvider, GameState } from '../live-score.types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

function toState(typeName: string): GameState {
  const n = typeName.toUpperCase();
  if (n === 'STATUS_IN_PROGRESS' || n === 'STATUS_HALFTIME') return 'live';
  if (n === 'STATUS_FINAL' || n === 'STATUS_FULL_TIME') return 'final';
  if (n === 'STATUS_SCHEDULED') return 'scheduled';
  if (n === 'STATUS_POSTPONED') return 'postponed';
  if (n === 'STATUS_SUSPENDED') return 'suspended';
  if (n === 'STATUS_CANCELED' || n === 'STATUS_CANCELLED') return 'cancelled';
  return 'scheduled';
}

export class NbaSportsdataProvider implements LiveScoreProvider {
  readonly sport = 'NBA' as const;
  private readonly logger = new Logger(NbaSportsdataProvider.name);

  async fetchGames(date: string): Promise<LiveGame[]> {
    try {
      // ESPN uses YYYYMMDD format
      const espnDate = date.replace(/-/g, '');
      const url = `${ESPN_BASE}?dates=${espnDate}&limit=20`;
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`NBA ESPN API ${res.status} for date ${date}`);
        return [];
      }
      const json = await res.json() as any;
      const events: any[] = json.events ?? [];
      return events.map((e) => this.normalize(e));
    } catch (err: any) {
      this.logger.error(`NBA fetch error: ${err?.message}`);
      return [];
    }
  }

  private normalize(event: any): LiveGame {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    const status = comp?.status;
    const typeName: string = status?.type?.name ?? 'STATUS_SCHEDULED';

    const state = toState(typeName);
    const isLive = state === 'live';
    const isFinal = state === 'final';

    // Period label — ESPN gives "shortDetail" like "9:22 - 2nd" or "Final"
    const shortDetail: string = status?.type?.shortDetail ?? '';
    let periodLabel: string | null = null;
    let timeRemaining: string | null = null;

    if (isLive) {
      // "9:22 - 2nd" → period = "Q2", time = "9:22"
      const match = shortDetail.match(/^([\d:]+)\s*[-–]\s*(.+)$/);
      if (match) {
        timeRemaining = match[1];
        const periodStr = match[2].trim().toLowerCase();
        if (periodStr === '1st') periodLabel = 'Q1';
        else if (periodStr === '2nd') periodLabel = 'Q2';
        else if (periodStr === '3rd') periodLabel = 'Q3';
        else if (periodStr === '4th') periodLabel = 'Q4';
        else if (periodStr.includes('ot')) periodLabel = 'OT';
        else periodLabel = match[2].trim();
      } else if (shortDetail.toLowerCase() === 'halftime') {
        periodLabel = 'Half';
      } else {
        periodLabel = shortDetail || 'Live';
      }
    } else if (isFinal) {
      periodLabel = shortDetail.toLowerCase().includes('ot') ? 'F/OT' : 'Final';
    }

    // Records
    const homeRecord = home?.records?.[0]?.summary ?? null;
    const awayRecord = away?.records?.[0]?.summary ?? null;

    // Scores
    const homeScore = (isLive || isFinal) && home?.score != null ? Number(home.score) : null;
    const awayScore = (isLive || isFinal) && away?.score != null ? Number(away.score) : null;

    // Status text
    let statusText = shortDetail;
    if (isLive && timeRemaining && periodLabel) {
      statusText = `${periodLabel} · ${timeRemaining}`;
    }

    return {
      id: `nba-${event.id}`,
      sport: 'NBA',
      homeTeam: home?.team?.displayName ?? home?.team?.name ?? '',
      awayTeam: away?.team?.displayName ?? away?.team?.name ?? '',
      homeTeamCode: home?.team?.abbreviation ?? '',
      awayTeamCode: away?.team?.abbreviation ?? '',
      homeScore,
      awayScore,
      state,
      isLive,
      isFinal,
      periodLabel,
      timeRemaining,
      homeRecord,
      awayRecord,
      gameTime: event.date ?? new Date().toISOString(),
      statusText,
    };
  }
}

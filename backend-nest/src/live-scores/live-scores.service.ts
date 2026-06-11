import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { LiveGame, LiveScoreProvider, Sport } from './live-score.types';
import { MlbStatsProvider } from './providers/mlb-stats.provider';
import { NbaSportsdataProvider } from './providers/nba-sportsdata.provider';

const LIVE_POLL_MS    = 15_000;   // 15s when at least one game is live
const IDLE_POLL_MS    = 5 * 60_000; // 5min when no games live

function todayPT(): string {
  // Use Pacific time so the date rolls at midnight PT, matching the US sports day
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

@Injectable()
export class LiveScoresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveScoresService.name);

  // ── Provider registry ─────────────────────────────────────────────────────
  private readonly providers = new Map<Sport, LiveScoreProvider>();

  // ── In-memory cache: sport → { date, games } ─────────────────────────────
  private readonly cache = new Map<Sport, { date: string; games: LiveGame[]; ts: number }>();

  // ── Polling timer ─────────────────────────────────────────────────────────
  private timer: ReturnType<typeof setTimeout> | null = null;

  onModuleInit() {
    // Register built-in providers
    this.register(new MlbStatsProvider());
    this.register(new NbaSportsdataProvider());

    // Kick off the first poll immediately
    this.poll().catch(() => {});
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  // ── Provider management ───────────────────────────────────────────────────

  /** Register a new sport provider at runtime (NBA, NFL, etc.) */
  register(provider: LiveScoreProvider) {
    this.providers.set(provider.sport, provider);
    this.logger.log(`Registered provider: ${provider.sport}`);
  }

  // ── Polling loop ──────────────────────────────────────────────────────────

  private async poll() {
    const date = todayPT();
    let anyLive = false;

    await Promise.all(
      Array.from(this.providers.values()).map(async (provider) => {
        try {
          const games = await provider.fetchGames(date);
          this.cache.set(provider.sport, { date, games, ts: Date.now() });
          if (games.some((g) => g.isLive)) anyLive = true;
          this.logger.debug(`${provider.sport}: ${games.length} games fetched (${games.filter(g=>g.isLive).length} live)`);
        } catch (err: any) {
          this.logger.error(`Poll error for ${provider.sport}: ${err?.message}`);
        }
      }),
    );

    // Schedule next poll — shorter when games are live
    const nextMs = anyLive ? LIVE_POLL_MS : IDLE_POLL_MS;
    this.timer = setTimeout(() => this.poll().catch(() => {}), nextMs);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** All games for all registered sports today */
  getAll(): LiveGame[] {
    const out: LiveGame[] = [];
    for (const cached of this.cache.values()) {
      out.push(...cached.games);
    }
    return out;
  }

  /** Games for a specific sport today */
  getBySport(sport: Sport): LiveGame[] {
    return this.cache.get(sport)?.games ?? [];
  }

  /** Force a refresh for a specific sport (used by tests / manual trigger) */
  async refresh(sport?: Sport): Promise<void> {
    const date = todayPT();
    const targets = sport
      ? [this.providers.get(sport)].filter(Boolean) as LiveScoreProvider[]
      : Array.from(this.providers.values());

    await Promise.all(
      targets.map(async (p) => {
        const games = await p.fetchGames(date);
        this.cache.set(p.sport, { date, games, ts: Date.now() });
      }),
    );
  }

  /** Which sports have live tracking, and which are coming soon */
  getSupportedSports() {
    return {
      supported: Array.from(this.providers.keys()),
      comingSoon: ['NBA', 'NFL', 'NHL', 'NCAAB', 'NCAAF'].filter(
        (s) => !this.providers.has(s as Sport),
      ),
    };
  }
}

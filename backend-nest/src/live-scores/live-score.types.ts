// ─── Canonical LiveGame shape shared across all providers ──────────────────────
// Add a new provider (NBA, NFL, NHL) without touching the frontend.

export type Sport = 'MLB' | 'NBA' | 'NFL' | 'NHL' | 'NCAAB' | 'NCAAF';

export type GameState = 'scheduled' | 'warmup' | 'live' | 'final' | 'postponed' | 'suspended' | 'cancelled';

export interface LiveGame {
  /** Stable ID (provider-specific, but unique within the registry) */
  id: string;
  sport: Sport;

  // Teams
  homeTeam: string;       // full name e.g. "New York Yankees"
  awayTeam: string;       // full name e.g. "Boston Red Sox"
  homeTeamCode: string;   // abbreviation e.g. "NYY"
  awayTeamCode: string;   // abbreviation e.g. "BOS"

  // Score (null = not started)
  homeScore: number | null;
  awayScore: number | null;

  // State
  state: GameState;
  isLive: boolean;
  isFinal: boolean;

  // Period info (sport-agnostic strings, formatted for display)
  /** "Top 4th", "Bot 7th", "Q3", "OT", "2nd" … */
  periodLabel: string | null;
  /** NBA/NHL: "4:32" remaining. MLB/NFL: null */
  timeRemaining: string | null;

  // Records (optional, provider may omit)
  homeRecord: string | null;  // "36-28"
  awayRecord: string | null;

  /** ISO-8601 scheduled start time */
  gameTime: string;

  /** Human-friendly status for tooltip / aria-label */
  statusText: string;
}

// ─── Provider interface — implement this for each sport ────────────────────────

export interface LiveScoreProvider {
  /** Which sport this provider handles */
  readonly sport: Sport;

  /**
   * Fetch games for a given date (YYYY-MM-DD).
   * Must never throw — return [] on failure.
   */
  fetchGames(date: string): Promise<LiveGame[]>;
}

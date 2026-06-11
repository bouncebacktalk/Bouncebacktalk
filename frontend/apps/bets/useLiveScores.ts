import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/api';
import type { BetLeg } from './bets';

// ── Types (mirrors backend LiveGame) ─────────────────────────────────────────

export type GameState = 'scheduled' | 'warmup' | 'live' | 'final' | 'postponed' | 'suspended' | 'cancelled';

export interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  state: GameState;
  isLive: boolean;
  isFinal: boolean;
  periodLabel: string | null;   // "Top 4th", "Bot 7th", "Q3", "OT", "Final"
  timeRemaining: string | null; // NBA/NHL only
  homeRecord: string | null;    // "36-28"
  awayRecord: string | null;
  gameTime: string;
  statusText: string;
}

export type LegResult = 'winning' | 'losing' | 'push' | null;

// ── Parlay tracking ───────────────────────────────────────────────────────────

export interface ParlayStatus {
  total: number;
  won: number;
  live: number;
  pending: number;
  lost: number;
  /** 0–100 */
  progressPct: number;
  /** true when all legs are settled */
  settled: boolean;
}

export function getParlayStatus(legs: BetLeg[], games: LiveGame[]): ParlayStatus {
  let won = 0, live = 0, pending = 0, lost = 0;
  for (const leg of legs) {
    if (leg.result === 'WON') { won++; continue; }
    if (leg.result === 'LOST') { lost++; continue; }
    // Unsettled — check live game
    const game = matchLegToGame(leg, games);
    if (game?.isLive) live++;
    else pending++;
  }
  const total = legs.length;
  const settled = won + lost === total;
  const progressPct = total === 0 ? 0 : Math.round((won / total) * 100);
  return { total, won, live, pending, lost, progressPct, settled };
}

// ── Team matching ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Maps known abbreviations / nicknames to fragments that appear in full team names
const TEAM_ALIASES: Record<string, string[]> = {
  // MLB
  nyy: ['yankees', 'new york yankees'],  nym: ['mets', 'new york mets'],
  bos: ['red sox', 'boston'],            lad: ['dodgers', 'los angeles dodgers'],
  sfg: ['giants', 'san francisco'],      chc: ['cubs', 'chicago cubs'],
  cws: ['white sox', 'chicago white'],   hou: ['astros', 'houston'],
  atl: ['braves', 'atlanta'],            phi: ['phillies', 'philadelphia'],
  mia: ['marlins', 'miami'],             wsh: ['nationals', 'washington'],
  cin: ['reds', 'cincinnati'],           pit: ['pirates', 'pittsburgh'],
  stl: ['cardinals', 'st. louis', 'saint louis'],
  mil: ['brewers', 'milwaukee'],         min: ['twins', 'minnesota'],
  det: ['tigers', 'detroit'],            cle: ['guardians', 'cleveland'],
  kc:  ['royals', 'kansas city'],        oak: ['athletics', 'oakland'],
  sea: ['mariners', 'seattle'],          tex: ['rangers', 'texas'],
  laa: ['angels', 'los angeles angels'], col: ['rockies', 'colorado'],
  ari: ['diamondbacks', 'dbacks', 'arizona'],
  sd:  ['padres', 'san diego'],          tb: ['rays', 'tampa bay'],
  bal: ['orioles', 'baltimore'],         tor: ['blue jays', 'toronto'],
  // NBA (ready for when NBA provider is added)
  gsw: ['warriors', 'golden state'],     okc: ['thunder', 'oklahoma'],
  lal: ['lakers', 'los angeles lakers'], lac: ['clippers'],
  bkn: ['nets', 'brooklyn'],             nyk: ['knicks', 'new york knicks'],
  sas: ['spurs', 'san antonio'],         phx: ['suns', 'phoenix'],
  dal: ['mavericks', 'mavs', 'dallas'],  den: ['nuggets', 'denver'],
};

function teamMatches(query: string, fullName: string, code: string): boolean {
  const q = norm(query);
  const full = norm(fullName);
  const c = norm(code);

  if (q === c || full === q) return true;
  if (full.includes(q) || q.includes(full.slice(0, 5))) return true;
  if (c.startsWith(q.slice(0, 3)) || q.startsWith(c.slice(0, 3))) return true;

  // Last word (nickname) match: "Yankees" matches "New York Yankees"
  const nickname = norm(fullName.split(' ').pop() ?? '');
  if (nickname.length > 2 && (q.includes(nickname) || nickname.includes(q.slice(0, 5)))) return true;

  // Alias table
  const aliasFrags = TEAM_ALIASES[q] ?? TEAM_ALIASES[c.toLowerCase()] ?? [];
  if (aliasFrags.some((f) => full.includes(norm(f)))) return true;

  // Check if query matches any alias key whose fragments match this team
  for (const [, frags] of Object.entries(TEAM_ALIASES)) {
    if (frags.some((f) => q.includes(norm(f))) && frags.some((f) => full.includes(norm(f)))) return true;
  }
  return false;
}

/**
 * Match a bet leg to a live game.
 * Uses leg.game ("NYY vs BOS"), leg.pick ("Yankees -1.5"), leg.sport ("MLB").
 */
export function matchLegToGame(leg: BetLeg, games: LiveGame[]): LiveGame | null {
  if (!games.length) return null;

  const gameStr = norm(leg.game ?? '');
  const pickStr = norm(leg.pick ?? '');
  const sport   = leg.sport?.toUpperCase();

  // Only search live games — never match a final game to a pending leg
  const pool = games.filter((g) => g.isLive &&
    (sport ? g.sport?.toUpperCase() === sport : true)
  );
  if (!pool.length) return null;

  for (const game of pool) {
    const homeNick = norm(game.homeTeam.split(' ').pop() ?? '');
    const awayNick = norm(game.awayTeam.split(' ').pop() ?? '');
    const homeCode = norm(game.homeTeamCode);
    const awayCode = norm(game.awayTeamCode);

    // 1. Game string must contain tokens for BOTH teams
    if (gameStr.length >= 4) {
      const homeInGame = gameStr.includes(homeCode) || (homeNick.length > 2 && gameStr.includes(homeNick));
      const awayInGame = gameStr.includes(awayCode) || (awayNick.length > 2 && gameStr.includes(awayNick));
      if (homeInGame && awayInGame) return game;
    }

    // 2. Pick string — only use if leg.game is absent, and require a meaningful team token (4+ chars)
    if (!leg.game && pickStr.length >= 4) {
      const teamPart = pickStr.replace(/[+\-]?\d+(\.\d+)?$/, '').trim();
      const query = teamPart.length >= 4 ? teamPart : pickStr;
      const hitsHome = teamMatches(query, game.homeTeam, game.homeTeamCode);
      const hitsAway = teamMatches(query, game.awayTeam, game.awayTeamCode);
      // Require the pick to match exactly one team (the picked side), not both
      if ((hitsHome || hitsAway) && !(hitsHome && hitsAway)) return game;
    }
  }
  return null;
}

// ── Win/loss computation ──────────────────────────────────────────────────────

/**
 * Determine if a bet leg is currently winning or losing.
 * Works for: spread ("NYY -1.5"), moneyline ("Yankees ML"), total ("Over 8.5").
 */
export function computeLegResult(leg: BetLeg, game: LiveGame): LegResult {
  if (game.homeScore == null || game.awayScore == null) return null;
  if (!game.isLive && !game.isFinal) return null;

  const raw = (leg.pick ?? '').trim();
  const lower = raw.toLowerCase();

  // ── Over / Under ────────────────────────────────────────────────────────
  const totalMatch = lower.match(/^(over|under)\s*([\d.]+)/);
  if (totalMatch) {
    const dir  = totalMatch[1];
    const line = parseFloat(totalMatch[2]);
    const tot  = game.homeScore + game.awayScore;
    if (tot === line) return 'push';
    return (dir === 'over' ? tot > line : tot < line) ? 'winning' : 'losing';
  }

  // ── Spread / Moneyline ───────────────────────────────────────────────────
  // Extract trailing number (the line): "-1.5", "+1.5", "-110"
  const lineMatch = raw.match(/([+-]?\d+(\.\d+)?)\s*$/);
  const spread = lineMatch ? parseFloat(lineMatch[1]) : null;

  // Team part is everything before the line
  const teamRaw = spread != null
    ? raw.slice(0, raw.lastIndexOf(lineMatch![0])).trim()
    : raw.replace(/\bml\b/i, '').trim();

  const teamNorm = norm(teamRaw || raw);

  const onHome = teamMatches(teamNorm, game.homeTeam, game.homeTeamCode);
  const onAway = teamMatches(teamNorm, game.awayTeam, game.awayTeamCode);
  if (!onHome && !onAway) return null;

  const myScore  = onHome ? game.homeScore : game.awayScore;
  const oppScore = onHome ? game.awayScore : game.homeScore;

  // Moneyline — is the spread an odds number? (> 20 = likely American odds not a spread)
  const isOdds = spread != null && Math.abs(spread) > 20;
  if (spread == null || isOdds) {
    if (myScore > oppScore) return 'winning';
    if (myScore < oppScore) return 'losing';
    return 'push';
  }

  // Spread: positive means we get points
  const adj = myScore + spread;
  if (adj > oppScore) return 'winning';
  if (adj < oppScore) return 'losing';
  return 'push';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const SUPPORTED_SPORTS = new Set(['MLB']);
const COMING_SOON_SPORTS = new Set(['NBA', 'NFL', 'NHL', 'NCAAB', 'NCAAF']);

export { SUPPORTED_SPORTS, COMING_SOON_SPORTS };

export function useLiveScores() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    try {
      const data = await apiGet<LiveGame[]>('/api/sports/live-scores');
      if (Array.isArray(data)) setGames(data);
    } catch {
      // silent — scores are best-effort
    }
  }

  function scheduleNext(currentGames: LiveGame[]) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const anyLive = currentGames.some((g) => g.isLive);
    const delay = anyLive ? 15_000 : 5 * 60_000;
    timerRef.current = setTimeout(async () => {
      await load();
      scheduleNext(games);
    }, delay);
  }

  useEffect(() => {
    load().then(() => scheduleNext(games));
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Re-schedule whenever games change
  useEffect(() => { scheduleNext(games); }, [games.some((g) => g.isLive)]);

  return games;
}

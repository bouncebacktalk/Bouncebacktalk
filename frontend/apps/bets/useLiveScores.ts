import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/api';
import type { BetLeg } from './bets';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Mirrors backend LiveGame shape */
export interface LiveScore {
  gameId: string;
  sport: 'NBA' | 'MLB' | string;
  homeTeam: string;
  awayTeam: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isLive: boolean;
  isFinal: boolean;
  /** Quarter # (NBA) or inning # (MLB) */
  period: string | null;
  /** Human label: "Q3", "OT", "Top 4th", "Bot 7th", "Half" */
  periodLabel: string | null;
  /** NBA only: "4:32" */
  timeRemaining: string | null;
  gameTime: string;
}

export type LegStatus = 'winning' | 'losing' | 'push' | null;

// ── Team name aliases ─────────────────────────────────────────────────────────

/** Maps abbreviation / short name → fragments that appear in full team names */
const ALIASES: Record<string, string[]> = {
  // NBA
  gsw: ['golden state', 'warriors'],
  okc: ['oklahoma', 'thunder'],
  lac: ['la clippers', 'clippers'],
  lal: ['la lakers', 'lakers', 'los angeles lakers'],
  sas: ['san antonio', 'spurs'],
  phx: ['phoenix', 'suns'],
  mia: ['miami', 'heat'],
  bos: ['boston', 'celtics'],
  nyk: ['new york', 'knicks'],
  nyc: ['new york', 'knicks'],
  bkn: ['brooklyn', 'nets'],
  phi: ['philadelphia', '76ers', 'sixers'],
  cle: ['cleveland', 'cavaliers', 'cavs'],
  mil: ['milwaukee', 'bucks'],
  chi: ['chicago', 'bulls'],
  ind: ['indiana', 'pacers'],
  det: ['detroit', 'pistons'],
  atl: ['atlanta', 'hawks'],
  cha: ['charlotte', 'hornets'],
  wsh: ['washington', 'wizards'],
  orl: ['orlando', 'magic'],
  tor: ['toronto', 'raptors'],
  den: ['denver', 'nuggets'],
  min: ['minnesota', 'timberwolves', 'wolves'],
  por: ['portland', 'trail blazers', 'blazers'],
  uta: ['utah', 'jazz'],
  sac: ['sacramento', 'kings'],
  dal: ['dallas', 'mavericks', 'mavs'],
  hou: ['houston', 'rockets'],
  mem: ['memphis', 'grizzlies'],
  nop: ['new orleans', 'pelicans'],
  // MLB
  nyy: ['new york yankees', 'yankees'],
  nym: ['new york mets', 'mets'],
  bos: ['boston', 'red sox'],
  lad: ['los angeles dodgers', 'dodgers'],
  sfg: ['san francisco', 'giants'],
  chc: ['chicago cubs', 'cubs'],
  cws: ['chicago white sox', 'white sox'],
  hou_mlb: ['houston', 'astros'],
  atl_mlb: ['atlanta', 'braves'],
  phi_mlb: ['philadelphia', 'phillies'],
  mia_mlb: ['miami', 'marlins'],
  nym_mlb: ['new york', 'mets'],
  wsh_mlb: ['washington', 'nationals'],
  cin: ['cincinnati', 'reds'],
  pit: ['pittsburgh', 'pirates'],
  stl: ['st. louis', 'cardinals'],
  mil_mlb: ['milwaukee', 'brewers'],
  min_mlb: ['minnesota', 'twins'],
  det_mlb: ['detroit', 'tigers'],
  cle_mlb: ['cleveland', 'guardians'],
  cws_mlb: ['chicago', 'white sox'],
  kc_mlb: ['kansas city', 'royals'],
  oak: ['oakland', 'athletics'],
  sea: ['seattle', 'mariners'],
  tex: ['texas', 'rangers'],
  laa: ['los angeles angels', 'angels'],
  col: ['colorado', 'rockies'],
  ari: ['arizona', 'diamondbacks', 'dbacks'],
  sd: ['san diego', 'padres'],
  tb: ['tampa bay', 'rays'],
  bal: ['baltimore', 'orioles'],
  tor_mlb: ['toronto', 'blue jays'],
};

// ── Matching helpers ──────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function teamFragments(team: string): string[] {
  const n = norm(team);
  // Last word is usually the nickname ("Warriors", "Yankees")
  const words = team.toLowerCase().trim().split(/\s+/);
  const nickname = norm(words[words.length - 1] ?? '');
  return [n, nickname].filter(Boolean);
}

function pickMatchesTeam(pickNorm: string, teamFull: string, teamCode: string): boolean {
  const frags = teamFragments(teamFull);
  const codeN = norm(teamCode);

  // Direct code match
  if (pickNorm === codeN) return true;
  if (pickNorm.startsWith(codeN) || codeN.startsWith(pickNorm.slice(0, 3))) return true;

  // Fragment match
  if (frags.some((f) => pickNorm.includes(f) || f.includes(pickNorm.slice(0, 5)))) return true;

  // Alias match
  for (const fragments of Object.values(ALIASES)) {
    const matchesTeam = fragments.some((f) => frags.some((tf) => tf.includes(norm(f)) || norm(f).includes(tf.slice(0, 4))));
    const matchesPick = fragments.some((f) => pickNorm.includes(norm(f)));
    if (matchesTeam && matchesPick) return true;
  }
  return false;
}

/**
 * Match a bet leg to a live score.
 * Uses leg.game (e.g. "LAL vs GSW"), leg.pick (e.g. "LAL -5.5"), leg.sport.
 */
export function matchLegToScore(leg: BetLeg, scores: LiveScore[]): LiveScore | null {
  if (!scores.length) return null;

  const gameStr = norm(leg.game ?? '');
  const pickStr = norm(leg.pick ?? '');
  const sportFilter = leg.sport?.toUpperCase();

  const candidates = sportFilter
    ? scores.filter((s) => s.sport?.toUpperCase() === sportFilter)
    : scores;

  for (const score of candidates) {
    const home = norm(score.homeTeam);
    const away = norm(score.awayTeam);
    const homeCode = norm(score.homeTeamCode ?? '');
    const awayCode = norm(score.awayTeamCode ?? '');

    // Match via game string (contains both team fragments)
    if (gameStr.length >= 3) {
      const homeMatch = gameStr.includes(home.slice(0, 4)) || gameStr.includes(homeCode);
      const awayMatch = gameStr.includes(away.slice(0, 4)) || gameStr.includes(awayCode);
      if (homeMatch && awayMatch) return score;

      // nickname only ("Warriors vs Celtics")
      const homeNick = teamFragments(score.homeTeam).find((f) => f.length > 3) ?? '';
      const awayNick = teamFragments(score.awayTeam).find((f) => f.length > 3) ?? '';
      if (gameStr.includes(homeNick) && gameStr.includes(awayNick)) return score;
    }

    // Match via pick string (usually contains one team)
    if (pickStr.length >= 2) {
      if (
        pickMatchesTeam(pickStr, score.homeTeam, score.homeTeamCode ?? '') ||
        pickMatchesTeam(pickStr, score.awayTeam, score.awayTeamCode ?? '')
      ) {
        return score;
      }
    }
  }

  return null;
}

// ── Win/loss computation ──────────────────────────────────────────────────────

/**
 * Parse a bet pick and determine if the bettor is currently winning/losing.
 *
 * Supported pick formats:
 *   "LAL -5.5"     → spread: LAL gives 5.5
 *   "Warriors ML"  → moneyline on Warriors
 *   "GSW"          → moneyline on GSW
 *   "Over 224.5"   → over on total
 *   "Under 8.5"    → under on total
 *   "NYY +1.5"     → spread: NYY gets 1.5
 */
export function computeLegStatus(leg: BetLeg, score: LiveScore): LegStatus {
  if (score.homeScore == null || score.awayScore == null) return null;
  if (!score.isLive && !score.isFinal) return null;

  const pickRaw = (leg.pick ?? '').trim();
  const pickLow = pickRaw.toLowerCase();

  // ── Total (Over/Under) ────────────────────────────────────────────────────
  const totalMatch = pickLow.match(/^(over|under)\s*([\d.]+)/);
  if (totalMatch) {
    const direction = totalMatch[1]; // "over" | "under"
    const line = parseFloat(totalMatch[2]);
    const total = score.homeScore + score.awayScore;
    if (total === line) return 'push';
    if (direction === 'over') return total > line ? 'winning' : 'losing';
    return total < line ? 'winning' : 'losing';
  }

  // ── Spread or Moneyline ───────────────────────────────────────────────────
  // Strip known suffixes like "ML", "-1h", "1st half", etc.
  const spreadMatch = pickRaw.match(/([+-]?[\d.]+)\s*$/);
  const spread = spreadMatch ? parseFloat(spreadMatch[1]) : null;

  // Determine which team the pick is on
  const pickTeamPart = spread != null
    ? pickRaw.slice(0, pickRaw.lastIndexOf(spreadMatch![1])).trim()
    : pickRaw.replace(/\bml\b/i, '').trim();

  const pickNorm = norm(pickTeamPart || pickRaw);

  const homeMatch = pickMatchesTeam(pickNorm, score.homeTeam, score.homeTeamCode ?? '');
  const awayMatch = pickMatchesTeam(pickNorm, score.awayTeam, score.awayTeamCode ?? '');

  if (!homeMatch && !awayMatch) return null;

  const pickedHome = homeMatch;
  const myScore = pickedHome ? score.homeScore : score.awayScore;
  const oppScore = pickedHome ? score.awayScore : score.homeScore;

  // Moneyline
  if (spread == null) {
    if (myScore > oppScore) return 'winning';
    if (myScore < oppScore) return 'losing';
    return 'push';
  }

  // Spread: positive spread means we get points added to our score
  const adjustedMy = myScore + spread;
  if (adjustedMy > oppScore) return 'winning';
  if (adjustedMy < oppScore) return 'losing';
  return 'push';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveScores(pollMs = 60_000) {
  const [scores, setScores] = useState<LiveScore[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const data = await apiGet<LiveScore[]>('/api/sports/live-scores');
      if (Array.isArray(data)) setScores(data);
    } catch {
      // silent — scores are best-effort
    }
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pollMs]);

  return scores;
}

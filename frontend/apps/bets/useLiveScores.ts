import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/api';
import type { BetLeg } from './bets';

export interface LiveScore {
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

// Normalize a string for fuzzy matching: lowercase, strip punctuation/spaces
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Common team name aliases (abbreviation → canonical fragments)
const ALIASES: Record<string, string[]> = {
  gsw: ['golden state', 'warriors'],
  okc: ['oklahoma', 'thunder'],
  lac: ['la clippers', 'clippers'],
  lal: ['la lakers', 'lakers'],
  sas: ['san antonio', 'spurs'],
  phx: ['phoenix', 'suns'],
  mia: ['miami', 'heat'],
  bos: ['boston', 'celtics'],
  nyc: ['new york', 'knicks'],
  nyk: ['new york', 'knicks'],
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
  nyy: ['new york', 'yankees'],
  bos_mlb: ['boston', 'red sox'],
  lad: ['los angeles', 'dodgers'],
  sf: ['san francisco', 'giants'],
  chc: ['chicago', 'cubs'],
  cws: ['chicago', 'white sox'],
  // NFL
  ne: ['new england', 'patriots'],
  kc: ['kansas city', 'chiefs'],
  sf_nfl: ['san francisco', '49ers'],
  gb: ['green bay', 'packers'],
  dal_nfl: ['dallas', 'cowboys'],
};

/**
 * Match a bet leg to a live score entry.
 * Uses the leg's `game`, `pick`, and `sport` fields.
 */
export function matchLegToScore(leg: BetLeg, scores: LiveScore[]): LiveScore | null {
  if (!scores.length) return null;

  const gameStr = norm(leg.game ?? '');
  const pickStr = norm(leg.pick ?? '');

  for (const score of scores) {
    const home = norm(score.homeTeam);
    const away = norm(score.awayTeam);

    // Direct substring match on game string
    if (gameStr) {
      if (
        (gameStr.includes(home) || home.includes(gameStr.slice(0, 4))) &&
        (gameStr.includes(away) || away.includes(gameStr.slice(-4)))
      ) {
        return score;
      }
      // Check if game string contains both team fragments
      if (gameStr.includes(home.slice(0, 4)) || gameStr.includes(away.slice(0, 4))) {
        if (gameStr.includes(home.slice(0, 4)) && gameStr.includes(away.slice(0, 4))) {
          return score;
        }
      }
    }

    // Match via pick string
    if (pickStr) {
      if (home.includes(pickStr.slice(0, 5)) || away.includes(pickStr.slice(0, 5))) {
        return score;
      }
      if (pickStr.includes(home.slice(0, 5)) || pickStr.includes(away.slice(0, 5))) {
        return score;
      }
      // Check aliases
      for (const [abbr, fragments] of Object.entries(ALIASES)) {
        if (pickStr.includes(abbr) || fragments.some((f) => pickStr.includes(norm(f)))) {
          if (
            fragments.some((f) => home.includes(norm(f))) ||
            fragments.some((f) => away.includes(norm(f)))
          ) {
            return score;
          }
        }
      }
    }
  }
  return null;
}

export function useLiveScores(pollMs = 60_000) {
  const [scores, setScores] = useState<LiveScore[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetch() {
    try {
      const data = await apiGet<LiveScore[]>('/api/sports/live-scores');
      if (Array.isArray(data)) setScores(data);
    } catch {
      // silent — scores are best-effort
    }
  }

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pollMs]);

  return scores;
}

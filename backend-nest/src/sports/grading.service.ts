import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';
import { SportsDataService } from './sports-data.service';
import { BetStatus } from '@prisma/client';

const TEAM_ALIASES: Record<string, { sport: string; names: string[] }> = {
  // MLB
  ari: { sport: 'MLB', names: ['arizona', 'diamondbacks', 'dbacks'] },
  atl: { sport: 'MLB', names: ['atlanta', 'braves', 'hawks'] },
  bal: { sport: 'MLB', names: ['baltimore', 'orioles'] },
  bos: { sport: 'MLB', names: ['boston', 'red sox', 'celtics'] },
  chc: { sport: 'MLB', names: ['chicago cubs', 'cubs'] },
  cws: { sport: 'MLB', names: ['chicago white sox', 'white sox'] },
  cin: { sport: 'MLB', names: ['cincinnati', 'reds'] },
  cle: { sport: 'MLB', names: ['cleveland', 'guardians', 'cavaliers', 'cavs'] },
  col: { sport: 'MLB', names: ['colorado', 'rockies'] },
  det: { sport: 'MLB', names: ['detroit', 'tigers', 'pistons'] },
  hou: { sport: 'MLB', names: ['houston', 'astros', 'rockets'] },
  kc: { sport: 'MLB', names: ['kansas city', 'royals'] },
  laa: { sport: 'MLB', names: ['los angeles angels', 'angels'] },
  lad: { sport: 'MLB', names: ['los angeles dodgers', 'dodgers'] },
  mia: { sport: 'MLB', names: ['miami', 'marlins', 'heat'] },
  mil: { sport: 'MLB', names: ['milwaukee', 'brewers', 'bucks'] },
  min: { sport: 'MLB', names: ['minnesota', 'twins', 'timberwolves', 'wolves'] },
  nym: { sport: 'MLB', names: ['new york mets', 'mets'] },
  nyy: { sport: 'MLB', names: ['new york yankees', 'yankees'] },
  oak: { sport: 'MLB', names: ['oakland', 'athletics'] },
  phi: { sport: 'MLB', names: ['philadelphia', 'phillies', '76ers', 'sixers'] },
  pit: { sport: 'MLB', names: ['pittsburgh', 'pirates'] },
  sd: { sport: 'MLB', names: ['san diego', 'padres'] },
  sea: { sport: 'MLB', names: ['seattle', 'mariners'] },
  sf: { sport: 'MLB', names: ['san francisco', 'giants'] },
  sfg: { sport: 'MLB', names: ['san francisco', 'giants'] },
  stl: { sport: 'MLB', names: ['st louis', 'saint louis', 'cardinals'] },
  tb: { sport: 'MLB', names: ['tampa bay', 'rays'] },
  tex: { sport: 'MLB', names: ['texas', 'rangers'] },
  tor: { sport: 'MLB', names: ['toronto', 'blue jays', 'raptors'] },
  wsh: { sport: 'MLB', names: ['washington', 'nationals', 'wizards'] },

  // NBA
  atl_hawks: { sport: 'NBA', names: ['atlanta hawks', 'hawks'] },
  bkn: { sport: 'NBA', names: ['brooklyn', 'nets'] },
  bos_celtics: { sport: 'NBA', names: ['boston celtics', 'celtics'] },
  cha: { sport: 'NBA', names: ['charlotte', 'hornets'] },
  chi: { sport: 'NBA', names: ['chicago bulls', 'bulls'] },
  cle_cavs: { sport: 'NBA', names: ['cleveland cavaliers', 'cavaliers', 'cavs'] },
  dal: { sport: 'NBA', names: ['dallas', 'mavericks', 'mavs'] },
  den: { sport: 'NBA', names: ['denver', 'nuggets'] },
  det_pistons: { sport: 'NBA', names: ['detroit pistons', 'pistons'] },
  gsw: { sport: 'NBA', names: ['golden state', 'warriors'] },
  hou_rockets: { sport: 'NBA', names: ['houston rockets', 'rockets'] },
  ind: { sport: 'NBA', names: ['indiana', 'pacers'] },
  lac: { sport: 'NBA', names: ['los angeles clippers', 'clippers'] },
  lal: { sport: 'NBA', names: ['los angeles lakers', 'lakers'] },
  mem: { sport: 'NBA', names: ['memphis', 'grizzlies'] },
  mia_heat: { sport: 'NBA', names: ['miami heat', 'heat'] },
  mil_bucks: { sport: 'NBA', names: ['milwaukee bucks', 'bucks'] },
  min_wolves: { sport: 'NBA', names: ['minnesota timberwolves', 'timberwolves', 'wolves'] },
  nop: { sport: 'NBA', names: ['new orleans', 'pelicans'] },
  nyk: { sport: 'NBA', names: ['new york knicks', 'knicks'] },
  okc: { sport: 'NBA', names: ['oklahoma city', 'thunder'] },
  orl: { sport: 'NBA', names: ['orlando', 'magic'] },
  phi_sixers: { sport: 'NBA', names: ['philadelphia 76ers', '76ers', 'sixers'] },
  phx: { sport: 'NBA', names: ['phoenix', 'suns'] },
  por: { sport: 'NBA', names: ['portland', 'trail blazers', 'blazers'] },
  sac: { sport: 'NBA', names: ['sacramento', 'kings'] },
  sas: { sport: 'NBA', names: ['san antonio', 'spurs'] },
  tor_raptors: { sport: 'NBA', names: ['toronto raptors', 'raptors'] },
  uta: { sport: 'NBA', names: ['utah', 'jazz'] },
  was: { sport: 'NBA', names: ['washington wizards', 'wizards'] },
};

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(
    private prisma: PrismaService,
    private sportsData: SportsDataService,
  ) {}

  /** Runs automatically every 5 minutes */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCronGrade() {
    this.logger.log('Auto-grading: checking pending bets...');
    const result = await this.gradePendingBets();
    this.logger.log(`Auto-grading complete: ${result.graded} graded, ${result.skipped} skipped`);
  }

  /** Called manually from the controller */
  async gradePendingBets(): Promise<{ graded: number; skipped: number; errors: number }> {
    const pendingBets = await this.prisma.bet.findMany({
      where: { status: 'PENDING' },
      include: { legs: true },
    });

    if (pendingBets.length === 0) return { graded: 0, skipped: 0, errors: 0 };

    // Fetch scores for the dates represented by pending bets. This keeps
    // yesterday's games available for settlement without showing them on Scores.
    const sports = this.supportedSports();
    const scoreDates = [...new Set(pendingBets.map((bet) => this.dateKey(bet.betDate)))];
    const scoresBySportDate: Record<string, any[]> = {};
    await Promise.all(
      sports.flatMap((sport) =>
        scoreDates.map(async (date) => {
          const scores = await this.sportsData.getScoresByDate(sport, date);
          if (scores.length > 0) scoresBySportDate[this.scoreKey(sport, date)] = scores;
        }),
      ),
    );

    let graded = 0;
    let skipped = 0;
    let errors = 0;

    for (const bet of pendingBets) {
      try {
        const gradedBet = this.gradeBetDetailed(bet, scoresBySportDate);
        if (!gradedBet?.status) { skipped++; continue; }

        const result = gradedBet.status;
        const profit = this.calculateProfit(bet.stake, bet.payout, result);
        await this.prisma.bet.update({
          where: { id: bet.id },
          data: {
            status: result,
            profit,
            settledAt: new Date(),
            legs: {
              update: gradedBet.legs.map((leg: any) => ({
                where: { id: leg.id },
                data: { result: leg.result },
              })),
            },
          },
        });
        graded++;
      } catch (err: any) {
        this.logger.error(`Error grading bet ${bet.id}: ${err?.message}`);
        errors++;
      }
    }

    return { graded, skipped, errors };
  }

  /** Grade a single bet manually by ID */
  async gradeBetById(betId: number, status: BetStatus): Promise<void> {
    const bet = await this.prisma.bet.findUnique({ where: { id: betId } });
    if (!bet) throw new Error(`Bet ${betId} not found`);

    const profit = this.calculateProfit(bet.stake, bet.payout, status);
    await this.prisma.bet.update({
      where: { id: betId },
      data: { status, profit, settledAt: new Date() },
    });
  }

  private gradeBetDetailed(bet: any, scoresBySportDate: Record<string, any[]>): { status: BetStatus | null; legs: { id: number; result: BetStatus | null }[] } | null {
    const betDate = this.dateKey(bet.betDate);

    // For straight bets with a single leg, try to match to a game result
    if (bet.type === 'STRAIGHT' && bet.legs?.length === 1) {
      const leg = bet.legs[0];
      const game = this.findGameForLeg(leg, betDate, scoresBySportDate);
      if (!game || game.status !== 'Final') return null;

      const result = this.gradeStraitLeg(leg, game);
      return { status: result, legs: [{ id: leg.id, result }] };
    }

    // For parlays — all legs must be final to grade
    if (bet.type === 'PARLAY' && bet.legs?.length > 0) {
      const gradedLegs = bet.legs.map((leg: any) => {
        if (leg.result === 'WON' || leg.result === 'LOST' || leg.result === 'PUSH') {
          return { id: leg.id, result: leg.result as BetStatus };
        }

        const game = this.findGameForLeg(leg, betDate, scoresBySportDate);
        if (!game) return { id: leg.id, result: null };

        if (game.status === 'Postponed' || game.status === 'Cancelled' || game.status === 'Canceled' || game.homeScore == null || game.awayScore == null) {
          return { id: leg.id, result: 'PUSH' as BetStatus };
        }

        if (game.status !== 'Final') return { id: leg.id, result: null };

        return { id: leg.id, result: this.gradeStraitLeg(leg, game) };
      });

      const legResults: (BetStatus | null)[] = gradedLegs.map((leg: any) => leg.result);

      if (legResults.some((r) => r === 'LOST')) return { status: 'LOST', legs: gradedLegs };
      if (legResults.some((r) => r === null)) return { status: null, legs: gradedLegs };
      if (legResults.every((r) => r === 'WON')) return { status: 'WON', legs: gradedLegs };
      if (legResults.some((r) => r === 'PUSH')) return { status: 'PUSH', legs: gradedLegs };
      return { status: null, legs: gradedLegs };
    }

    return null;
  }

  private findGameForLeg(leg: any, betDate: string, scoresBySportDate: Record<string, any[]>): any | null {
    const detectedSport = this.detectSport(leg.sport, leg.game, leg.pick);
    if (detectedSport && !this.supportedSports().includes(detectedSport)) return null;

    const sportsToTry = detectedSport
      ? [detectedSport, ...this.supportedSports().filter((sport) => sport !== detectedSport)]
      : this.supportedSports();

    for (const sport of sportsToTry) {
      const scores = scoresBySportDate[this.scoreKey(sport, betDate)] ?? [];
      const game = this.matchGame(leg.game, leg.pick, scores);
      if (game) return game;
    }

    return null;
  }

  private supportedSports(): string[] {
    return ['NBA', 'MLB'];
  }

  private gradeStraitLeg(leg: any, game: any): BetStatus | null {
    const betType = (leg.betType ?? '').toLowerCase();
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const total = homeScore + awayScore;
    const pick = (leg.pick ?? '').toLowerCase();
    const pickedSide = this.pickedSide(leg, game);

    // Moneyline
    if (betType.includes('moneyline') || betType === 'ml') {
      if (pickedSide === 'home') return homeScore > awayScore ? 'WON' : homeScore === awayScore ? 'PUSH' : 'LOST';
      if (pickedSide === 'away') return awayScore > homeScore ? 'WON' : homeScore === awayScore ? 'PUSH' : 'LOST';
    }

    // Spread
    if (betType.includes('spread')) {
      const lineMatch = (leg.line ?? leg.pick ?? '').match(/([+-]?\d+\.?\d*)/);
      if (lineMatch) {
        const spread = parseFloat(lineMatch[1]);
        if (pickedSide === 'home') {
          const covered = homeScore + spread - awayScore;
          if (covered > 0) return 'WON';
          if (covered < 0) return 'LOST';
          return 'PUSH';
        }
        if (pickedSide === 'away') {
          const covered = awayScore + spread - homeScore;
          if (covered > 0) return 'WON';
          if (covered < 0) return 'LOST';
          return 'PUSH';
        }
      }
    }

    // Total (over/under)
    if (betType.includes('total') || betType.includes('over') || betType.includes('under')) {
      const lineMatch = (leg.line ?? leg.pick ?? '').match(/(\d+\.?\d*)/);
      if (lineMatch) {
        const ou = parseFloat(lineMatch[1]);
        if (pick.includes('over')) {
          if (total > ou) return 'WON';
          if (total < ou) return 'LOST';
          return 'PUSH';
        }
        if (pick.includes('under')) {
          if (total < ou) return 'WON';
          if (total > ou) return 'LOST';
          return 'PUSH';
        }
      }
    }

    return null; // can't determine
  }

  private detectSport(sport: string | null, game: string | null, pick: string | null): string | null {
    const text = `${sport ?? ''} ${game ?? ''} ${pick ?? ''}`.toLowerCase();
    if (text.includes('nba') || text.includes('basketball')) return 'NBA';
    if (text.includes('nfl') || text.includes('football')) return 'NFL';
    if (text.includes('mlb') || text.includes('baseball')) return 'MLB';
    if (text.includes('nhl') || text.includes('hockey')) return 'NHL';
    if (text.includes('ncaaf') || text.includes('college football')) return 'NCAAF';
    if (text.includes('ncaab') || text.includes('college basketball')) return 'NCAAB';
    if (sport) return sport.toUpperCase();
    const tokens = this.teamTokens(game, pick);
    const sports = new Set(tokens.map((token) => TEAM_ALIASES[this.norm(token)]?.sport).filter(Boolean));
    if (sports.size === 1) return [...sports][0] as string;
    return null;
  }

  private matchGame(game: string | null, pick: string | null, scores: any[]): any | null {
    if (!scores.length) return null;
    const gameTokens = this.gameTokens(game);
    const pickTeam = this.pickTeam(pick);

    if (gameTokens.length >= 2) {
      const matched = scores.find((score) => this.matchesBothTeams(gameTokens[0], gameTokens[1], score));
      if (matched) return matched;
    }

    if (gameTokens.length === 1) {
      const matched = scores.find((score) =>
        this.teamMatches(gameTokens[0], score.homeTeam, score.homeTeamCode) ||
        this.teamMatches(gameTokens[0], score.awayTeam, score.awayTeamCode),
      );
      if (matched) return matched;
    }

    if (pickTeam) {
      const matched = scores.find((score) =>
        this.teamMatches(pickTeam, score.homeTeam, score.homeTeamCode) ||
        this.teamMatches(pickTeam, score.awayTeam, score.awayTeamCode),
      );
      if (matched) return matched;
    }

    const needle = `${game ?? ''} ${pick ?? ''}`.toLowerCase();
    return scores.find((s) => {
      const hay = `${s.homeTeam} ${s.awayTeam}`.toLowerCase();
      const homeWords = s.homeTeam.toLowerCase().split(/\s+/);
      const awayWords = s.awayTeam.toLowerCase().split(/\s+/);
      return (
        homeWords.some((w: string) => w.length > 3 && needle.includes(w)) ||
        awayWords.some((w: string) => w.length > 3 && needle.includes(w)) ||
        needle.includes(hay)
      );
    }) ?? null;
  }

  private matchesBothTeams(first: string, second: string, score: any): boolean {
    const firstHome = this.teamMatches(first, score.homeTeam, score.homeTeamCode);
    const firstAway = this.teamMatches(first, score.awayTeam, score.awayTeamCode);
    const secondHome = this.teamMatches(second, score.homeTeam, score.homeTeamCode);
    const secondAway = this.teamMatches(second, score.awayTeam, score.awayTeamCode);
    return (firstHome && secondAway) || (firstAway && secondHome);
  }

  private pickedSide(leg: any, game: any): 'home' | 'away' | null {
    const pickTeam = this.pickTeam(leg.pick);
    if (!pickTeam) return null;
    if (this.teamMatches(pickTeam, game.homeTeam, game.homeTeamCode)) return 'home';
    if (this.teamMatches(pickTeam, game.awayTeam, game.awayTeamCode)) return 'away';
    return null;
  }

  private teamMatches(query: string | null | undefined, fullName: string | null | undefined, code?: string | null): boolean {
    const q = this.norm(query ?? '');
    const full = this.norm(fullName ?? '');
    const c = this.norm(code ?? '');
    if (!q || !full) return false;

    if (q === c || q === full) return true;
    if (c && (q === c || c.startsWith(q) || q.startsWith(c))) return true;
    if (full.includes(q) || q.includes(full)) return true;

    const nickname = this.norm((fullName ?? '').split(/\s+/).pop() ?? '');
    if (nickname.length > 2 && (q === nickname || q.includes(nickname) || nickname.includes(q))) return true;

    const queryAlias = TEAM_ALIASES[q];
    if (queryAlias?.names.some((name) => full.includes(this.norm(name)))) return true;

    const codeAlias = TEAM_ALIASES[c];
    if (codeAlias?.names.some((name) => full.includes(this.norm(name)))) return true;

    return Object.values(TEAM_ALIASES).some(({ names }) => {
      const queryHitsAlias = names.some((name) => q.includes(this.norm(name)));
      const teamHitsAlias = names.some((name) => full.includes(this.norm(name)));
      return queryHitsAlias && teamHitsAlias;
    });
  }

  private gameTokens(game: string | null | undefined): string[] {
    const text = (game ?? '').trim();
    if (!text) return [];
    return text.split(/\s+(?:vs\.?|@|at)\s+/i).map((part) => part.trim()).filter(Boolean);
  }

  private pickTeam(pick: string | null | undefined): string | null {
    const text = (pick ?? '').trim();
    if (!text || /\b(over|under)\b/i.test(text)) return null;
    return text
      .replace(/\b(ml|moneyline)\b/ig, '')
      .replace(/\s*[+-]\d+(?:\.\d+)?\s*$/, '')
      .trim() || null;
  }

  private teamTokens(game: string | null | undefined, pick: string | null | undefined): string[] {
    const tokens = this.gameTokens(game);
    const pickTeam = this.pickTeam(pick);
    if (pickTeam) tokens.push(pickTeam);
    return tokens;
  }

  private norm(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private dateKey(value: Date | string): string {
    return new Date(value).toISOString().slice(0, 10);
  }

  private scoreKey(sport: string, date: string): string {
    return `${sport.toUpperCase()}:${date}`;
  }

  private calculateProfit(stake: any, payout: any, status: BetStatus): number {
    const s = Number(stake);
    const p = Number(payout);
    if (status === 'WON') return parseFloat((p - s).toFixed(2));
    if (status === 'LOST') return parseFloat((-s).toFixed(2));
    if (status === 'PUSH') return 0;
    return 0;
  }
}

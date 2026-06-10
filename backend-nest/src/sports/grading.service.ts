import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';
import { SportsDataService } from './sports-data.service';
import { BetStatus } from '@prisma/client';

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(
    private prisma: PrismaService,
    private sportsData: SportsDataService,
  ) {}

  /** Runs automatically every hour */
  @Cron(CronExpression.EVERY_HOUR)
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

    // Fetch today's scores for all sports
    const sports = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];
    const scoresBySport: Record<string, any[]> = {};
    await Promise.all(
      sports.map(async (sport) => {
        const scores = await this.sportsData.getScoresByDate(sport);
        if (scores.length > 0) scoresBySport[sport] = scores;
      }),
    );

    let graded = 0;
    let skipped = 0;
    let errors = 0;

    for (const bet of pendingBets) {
      try {
        const result = this.gradeBet(bet, scoresBySport);
        if (!result) { skipped++; continue; }

        const profit = this.calculateProfit(bet.stake, bet.payout, result);
        await this.prisma.bet.update({
          where: { id: bet.id },
          data: {
            status: result,
            profit,
            settledAt: new Date(),
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

  private gradeBet(bet: any, scoresBySport: Record<string, any[]>): BetStatus | null {
    // For straight bets with a single leg, try to match to a game result
    if (bet.type === 'STRAIGHT' && bet.legs?.length === 1) {
      const leg = bet.legs[0];
      const sport = this.detectSport(leg.sport, leg.game, leg.pick);
      if (!sport) return null;

      const scores = scoresBySport[sport] ?? [];
      const game = this.matchGame(leg.game, leg.pick, scores);
      if (!game || game.status !== 'Final') return null;

      return this.gradeStraitLeg(leg, game);
    }

    // For parlays — all legs must be final to grade
    if (bet.type === 'PARLAY' && bet.legs?.length > 0) {
      const legResults: (BetStatus | null)[] = bet.legs.map((leg: any) => {
        const sport = this.detectSport(leg.sport, leg.game, leg.pick);
        if (!sport) return null;
        const scores = scoresBySport[sport] ?? [];
        const game = this.matchGame(leg.game, leg.pick, scores);
        if (!game || game.status !== 'Final') return null;
        return this.gradeStraitLeg(leg, game);
      });

      if (legResults.some((r) => r === null)) return null; // not all settled
      if (legResults.some((r) => r === 'LOST')) return 'LOST';
      if (legResults.every((r) => r === 'WON')) return 'WON';
      if (legResults.some((r) => r === 'PUSH')) return 'PUSH';
      return null;
    }

    return null;
  }

  private gradeStraitLeg(leg: any, game: any): BetStatus | null {
    const betType = (leg.betType ?? '').toLowerCase();
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const total = homeScore + awayScore;
    const pick = (leg.pick ?? '').toLowerCase();
    const home = (game.homeTeam ?? '').toLowerCase();
    const away = (game.awayTeam ?? '').toLowerCase();

    // Moneyline
    if (betType.includes('moneyline') || betType === 'ml') {
      if (pick.includes(home)) return homeScore > awayScore ? 'WON' : homeScore === awayScore ? 'PUSH' : 'LOST';
      if (pick.includes(away)) return awayScore > homeScore ? 'WON' : homeScore === awayScore ? 'PUSH' : 'LOST';
    }

    // Spread
    if (betType.includes('spread')) {
      const lineMatch = (leg.line ?? leg.pick ?? '').match(/([+-]?\d+\.?\d*)/);
      if (lineMatch) {
        const spread = parseFloat(lineMatch[1]);
        if (pick.includes(home)) {
          const covered = homeScore + spread - awayScore;
          if (covered > 0) return 'WON';
          if (covered < 0) return 'LOST';
          return 'PUSH';
        }
        if (pick.includes(away)) {
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
    return null;
  }

  private matchGame(game: string | null, pick: string | null, scores: any[]): any | null {
    if (!scores.length) return null;
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

  private calculateProfit(stake: any, payout: any, status: BetStatus): number {
    const s = Number(stake);
    const p = Number(payout);
    if (status === 'WON') return parseFloat((p - s).toFixed(2));
    if (status === 'LOST') return parseFloat((-s).toFixed(2));
    if (status === 'PUSH') return 0;
    return 0;
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SportsDataService } from './sports-data.service';
import { GradingService } from './grading.service';
import { PreferencesService } from './preferences.service';
import { LiveScoresService } from '../live-scores/live-scores.service';
import type { Sport } from '../live-scores/live-score.types';

@Controller('sports')
export class SportsController {
  constructor(
    private sportsData: SportsDataService,
    private grading: GradingService,
    private prefs: PreferencesService,
    private liveScores: LiveScoresService,
  ) {}

  // ── Public — no auth required ──────────────────────────────────────────────

  /**
   * GET /api/sports/live-scores
   * Returns LiveGame[] for all registered sports (currently MLB).
   * Polled every 15s when games are live, 5min otherwise.
   * Optional ?sport=MLB to filter by sport.
   */
  @Get('live-scores')
  getLiveScores(@Query('sport') sport?: string) {
    if (sport) return this.liveScores.getBySport(sport.toUpperCase() as Sport);
    return this.liveScores.getAll();
  }

  /** GET /api/sports/live-scores/status */
  @Get('live-scores/status')
  getLiveScoresStatus() {
    return this.liveScores.getSupportedSports();
  }

  /** GET /api/sports/odds?sport=NBA */
  @Get('odds')
  getOdds(@Query('sport') sport: string, @Query('date') date?: string) {
    if (!sport || sport === 'ALL') return this.sportsData.getAllOddsToday();
    return this.sportsData.getOddsByDate(sport, date);
  }

  /** GET /api/sports/scores?sport=NBA */
  @Get('scores')
  getScores(@Query('sport') sport: string, @Query('date') date?: string) {
    return this.sportsData.getScoresByDate(sport, date);
  }

  // ── Auth-required ──────────────────────────────────────────────────────────

  /** POST /api/sports/grade — manual trigger */
  @UseGuards(JwtAuthGuard)
  @Post('grade')
  gradeNow() {
    return this.grading.gradePendingBets();
  }

  /** POST /api/sports/refresh — force re-fetch from providers */
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  refreshScores(@Query('sport') sport?: string) {
    return this.liveScores.refresh(sport as Sport | undefined);
  }

  /** GET /api/sports/preferences */
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: number) {
    return this.prefs.getSportsbooks(userId);
  }

  /** GET /api/sports/preferences/all */
  @UseGuards(JwtAuthGuard)
  @Get('preferences/all')
  getAllSportsbooks() {
    return this.prefs.getAllSportsbooks();
  }

  /** POST /api/sports/preferences */
  @UseGuards(JwtAuthGuard)
  @Post('preferences')
  setPreferences(
    @CurrentUser('id') userId: number,
    @Body('sportsbooks') sportsbooks: string[],
  ) {
    return this.prefs.setSportsbooks(userId, sportsbooks);
  }
}

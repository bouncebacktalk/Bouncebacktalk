import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SportsDataService } from './sports-data.service';
import { GradingService } from './grading.service';
import { PreferencesService } from './preferences.service';

@Controller('sports')
export class SportsController {
  constructor(
    private sportsData: SportsDataService,
    private grading: GradingService,
    private prefs: PreferencesService,
  ) {}

  // ── Public endpoints (no auth required) ────────────────────────────────────

  /** GET /api/sports/live-scores — NBA + MLB live games, 60s cached */
  @Get('live-scores')
  getLiveScores(@Query('date') date?: string) {
    return this.sportsData.getAllLiveGamesToday(date);
  }

  /** GET /api/sports/live-scores/status */
  @Get('live-scores/status')
  getLiveScoresStatus() {
    return { supported: ['NBA', 'MLB'], comingSoon: ['NFL', 'NHL', 'NCAAF', 'NCAAB'] };
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

  // ── Auth-required endpoints ────────────────────────────────────────────────

  /** POST /api/sports/grade — manual trigger */
  @UseGuards(JwtAuthGuard)
  @Post('grade')
  gradeNow() {
    return this.grading.gradePendingBets();
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

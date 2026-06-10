import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SportsDataService } from './sports-data.service';
import { GradingService } from './grading.service';
import { PreferencesService } from './preferences.service';

@UseGuards(JwtAuthGuard)
@Controller('sports')
export class SportsController {
  constructor(
    private sportsData: SportsDataService,
    private grading: GradingService,
    private prefs: PreferencesService,
  ) {}

  /** GET /api/sports/odds?sport=NBA&date=2026-06-10 */
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

  /** GET /api/sports/live-scores — all sports in parallel, 60s cached */
  @Get('live-scores')
  getLiveScores() {
    return this.sportsData.getAllScoresToday();
  }

  /** POST /api/sports/grade — manual trigger */
  @Post('grade')
  gradeNow() {
    return this.grading.gradePendingBets();
  }

  /** GET /api/sports/preferences */
  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: number) {
    return this.prefs.getSportsbooks(userId);
  }

  /** GET /api/sports/preferences/all */
  @Get('preferences/all')
  getAllSportsbooks() {
    return this.prefs.getAllSportsbooks();
  }

  /** POST /api/sports/preferences */
  @Post('preferences')
  setPreferences(
    @CurrentUser('id') userId: number,
    @Body('sportsbooks') sportsbooks: string[],
  ) {
    return this.prefs.setSportsbooks(userId, sportsbooks);
  }
}

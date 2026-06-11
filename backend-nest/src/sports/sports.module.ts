import { Module } from '@nestjs/common';
import { SportsDataService } from './sports-data.service';
import { GradingService } from './grading.service';
import { PreferencesService } from './preferences.service';
import { SportsController } from './sports.controller';
import { PrismaModule } from '../prisma';
import { LiveScoresModule } from '../live-scores/live-scores.module';

@Module({
  imports: [PrismaModule, LiveScoresModule],
  controllers: [SportsController],
  providers: [SportsDataService, GradingService, PreferencesService],
  exports: [SportsDataService, GradingService, PreferencesService],
})
export class SportsModule {}

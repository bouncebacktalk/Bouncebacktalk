import { Module } from '@nestjs/common';
import { LiveScoresService } from './live-scores.service';

@Module({
  providers: [LiveScoresService],
  exports:   [LiveScoresService],
})
export class LiveScoresModule {}

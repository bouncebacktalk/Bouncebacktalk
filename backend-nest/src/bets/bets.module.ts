import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';
import { OcrService } from './ocr.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
  ],
  controllers: [BetsController],
  providers: [BetsService, OcrService],
})
export class BetsModule {}

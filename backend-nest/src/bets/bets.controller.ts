import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BetsService } from './bets.service';
import { OcrService } from './ocr.service';
import { CreateBetDto, UpdateBetDto, BetFilterDto } from './dto/bets.dto';
import { memoryStorage } from 'multer';

@UseGuards(JwtAuthGuard)
@Controller('bets')
export class BetsController {
  constructor(
    private betsService: BetsService,
    private ocrService: OcrService,
  ) {}

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateBetDto) {
    return this.betsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query() filter: BetFilterDto) {
    return this.betsService.findAll(userId, filter);
  }

  @Get('stats')
  stats(@CurrentUser('id') userId: number) {
    return this.betsService.getStats(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.betsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBetDto,
  ) {
    return this.betsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.betsService.remove(userId, id);
  }

  @Post('ocr')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async extractOcr(@UploadedFile() file: Express.Multer.File) {
    return this.ocrService.extract(file);
  }
}

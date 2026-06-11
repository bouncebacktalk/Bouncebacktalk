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

@Controller('bets')
export class BetsController {
  constructor(
    private betsService: BetsService,
    private ocrService: OcrService,
  ) {}

  // Auth temporarily bypassed — hardcoded to owner userId=1
  private readonly OWNER_ID = 1;

  @Post()
  create(@Body() dto: CreateBetDto) {
    return this.betsService.create(this.OWNER_ID, dto);
  }

  @Get()
  findAll(@Query() filter: BetFilterDto) {
    return this.betsService.findAll(this.OWNER_ID, filter);
  }

  @Get('stats')
  stats() {
    return this.betsService.getStats(this.OWNER_ID);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.betsService.findOne(this.OWNER_ID, id);
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

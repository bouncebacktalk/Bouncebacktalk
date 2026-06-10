import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BetStatus, BetType } from '@prisma/client';

export class CreateBetLegDto {
  @IsOptional() @IsString() sport?: string;
  @IsOptional() @IsString() league?: string;
  @IsOptional() @IsString() game?: string;
  @IsOptional() @IsString() betType?: string;
  @IsOptional() @IsString() pick?: string;
  @IsOptional() @IsString() line?: string;
  @IsOptional() @IsInt() odds?: number;
}

export class CreateBetDto {
  @IsEnum(BetType) type!: BetType;
  @IsOptional() @IsString() sportsbook?: string;
  @IsNumber() @Min(0.01) stake!: number;
  @IsInt() odds!: number;
  @IsNumber() @Min(0) payout!: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() screenshotUrl?: string;
  @IsOptional() @IsDateString() betDate?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateBetLegDto)
  legs?: CreateBetLegDto[];
}

export class UpdateBetDto {
  @IsOptional() @IsEnum(BetStatus) status?: BetStatus;
  @IsOptional() @IsString() sportsbook?: string;
  @IsOptional() @IsNumber() @Min(0.01) stake?: number;
  @IsOptional() @IsInt() odds?: number;
  @IsOptional() @IsNumber() @Min(0) payout?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() betDate?: string;
}

export class BetFilterDto {
  @IsOptional() @IsEnum(BetStatus) status?: BetStatus;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() sportsbook?: string;
  @IsOptional() @IsEnum(BetType) type?: BetType;
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() offset?: string;
  @IsOptional() @IsString() search?: string;
}

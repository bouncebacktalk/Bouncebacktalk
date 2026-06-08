import { applyDecorators } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { LeadStatus } from "@prisma/client";
import { EmailField } from "../../auth/dto/auth-fields";

/** Trimmed optional text; empty string becomes undefined (column stays null). */
function OptionalText(max: number) {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }),
    IsOptional(),
    IsString(),
    MaxLength(max),
  );
}

/** Shared id list for bulk ops: 1-500 unique positive ints. */
function IdList() {
  return applyDecorators(
    Transform(({ value }) =>
      Array.isArray(value) ? [...new Set(value)] : value,
    ),
    IsArray(),
    ArrayMinSize(1, { message: "Select at least one lead." }),
    ArrayMaxSize(500, { message: "Select at most 500 leads at once." }),
    IsInt({ each: true }),
    IsPositive({ each: true }),
  );
}

export class CreateLeadDto {
  @OptionalText(120)
  name?: string;

  @EmailField()
  email!: string;

  @OptionalText(160)
  company?: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: "Message must be at least 10 characters." })
  @MaxLength(4000, { message: "Message must be at most 4000 characters." })
  message!: string;

  @OptionalText(120)
  source: string = "contact";

  // Honeypot: bots fill it, humans never see it. Never stored (see the service).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}

export class ListLeadsQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

export class LeadIdParamDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id!: number;
}

export class UpdateLeadDto {
  @IsEnum(LeadStatus, { message: "Choose a lead status." })
  status!: LeadStatus;
}

export class BulkDeleteLeadsDto {
  @IdList()
  ids!: number[];
}

export class BulkUpdateLeadStatusDto {
  @IdList()
  ids!: number[];

  @IsEnum(LeadStatus, { message: "Choose a lead status." })
  status!: LeadStatus;
}

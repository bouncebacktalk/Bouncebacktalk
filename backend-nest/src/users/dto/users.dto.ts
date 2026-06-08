import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class UserIdParamDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id!: number;
}

export class ListUsersQueryDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class SetAdminDto {
  @IsBoolean()
  isAdmin!: boolean;
}

export class UpdateProfileDto {
  // Empty string clears the name (-> null). The key is required; null allowed.
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() || null : value,
  )
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(120)
  name!: string | null;
}

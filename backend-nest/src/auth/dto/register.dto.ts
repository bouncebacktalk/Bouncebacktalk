import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { EmailField, PasswordField } from "./auth-fields";

/**
 * Registration payload, validated by the global ValidationPipe.
 * Passwords are intentionally simple for the starter (8+ chars, no composition
 * rules). Tighten `PasswordField` when your threat model needs it.
 */
export class RegisterDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}

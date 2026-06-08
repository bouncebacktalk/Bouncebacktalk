import { IsString, MinLength } from "class-validator";
import { PasswordField } from "./auth-fields";

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @PasswordField()
  newPassword!: string;
}

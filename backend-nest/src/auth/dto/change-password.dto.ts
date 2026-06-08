import { IsString, MinLength } from "class-validator";
import { PasswordField } from "./auth-fields";
import { IsDifferentFrom } from "../../common/is-different-from.decorator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: "Enter your current password." })
  currentPassword!: string;

  @PasswordField()
  @IsDifferentFrom("currentPassword", {
    message: "Choose a password different from your current one.",
  })
  newPassword!: string;
}

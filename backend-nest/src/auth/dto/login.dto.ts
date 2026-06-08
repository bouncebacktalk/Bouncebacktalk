import { IsString, MaxLength, MinLength } from "class-validator";
import { EmailField } from "./auth-fields";

export class LoginDto {
  @EmailField()
  email!: string;

  @IsString()
  @MinLength(1, { message: "Enter your password." })
  @MaxLength(128, { message: "Use 128 characters or fewer." })
  password!: string;
}

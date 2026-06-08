import { EmailField } from "./auth-fields";

export class ForgotPasswordDto {
  @EmailField()
  email!: string;
}

import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailTemplateService } from "./email-template.service";

/**
 * EmailModule - global so feature modules can inject EmailService without
 * importing this module everywhere.
 *
 * Always loaded (no opt-in). The default backend is `console` which works
 * with zero config; flipping to `resend` only requires an API key.
 */
@Global()
@Module({
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}

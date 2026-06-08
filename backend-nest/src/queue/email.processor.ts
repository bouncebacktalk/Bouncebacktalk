import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { EmailService, EmailTemplateService } from "../email";
import { Logger } from "../logger";
import type { EmailJob } from "./email-job.types";
import { EMAIL_QUEUE } from "./queue.constants";

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly templates: EmailTemplateService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<EmailJob>) {
    switch (job.data.kind) {
      case "password-reset": {
        const message = await this.templates.passwordReset(job.data);
        const result = await this.emailService.send(message);
        this.logger.log(
          `sent password-reset email job ${job.id}: ${result.messageId}`,
        );
        return result;
      }
      case "lead-notification": {
        const message = await this.templates.leadNotification(job.data);
        const result = await this.emailService.send(message);
        this.logger.log(
          `sent lead-notification email job ${job.id}: ${result.messageId}`,
        );
        return result;
      }
      case "raw": {
        const result = await this.emailService.send(job.data.message);
        this.logger.log(`sent raw email job ${job.id}: ${result.messageId}`);
        return result;
      }
      case "healthcheck":
        this.logger.log(`processed email queue healthcheck job ${job.id}`);
        return { ok: true, requestedAt: job.data.requestedAt };
      default:
        return assertNever(job.data);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled email job kind: ${JSON.stringify(value)}`);
}

import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "../config";
import { Logger } from "../logger";
import { ConsoleBackend } from "./backends/console.backend";
import { ResendBackend } from "./backends/resend.backend";
import type { EmailBackend, EmailMessage, SendResult } from "./interfaces";

/**
 * EmailService - the only thing the rest of the app talks to.
 *
 * Picks a backend from `MAIL_TRANSPORT` env at boot. All other code calls
 * `emailService.send({...})` and doesn't care which transport runs.
 *
 * Grow what you need:
 *   - Templates → render before calling send (we keep it data-in / data-out)
 *   - Queueing → enqueue an `email` job; have the processor call this service
 *   - Audit log → wrap in a service that writes to a DB before/after send
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private backend!: EmailBackend;
  private defaultFrom!: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.defaultFrom = this.config.env.MAIL_FROM;
    const transport = this.config.env.MAIL_TRANSPORT;

    switch (transport) {
      case "resend":
        this.backend = new ResendBackend(
          this.config.env.RESEND_API_KEY,
          this.defaultFrom,
          this.logger,
        );
        this.logger.log("Email transport: resend");
        break;
      case "console":
      default:
        this.backend = new ConsoleBackend(this.logger);
        this.logger.log(
          "Email transport: console (set MAIL_TRANSPORT=resend to send for real)",
        );
        break;
    }
  }

  async send(msg: EmailMessage): Promise<SendResult> {
    return this.backend.send({
      ...msg,
      from: msg.from ?? this.defaultFrom,
    });
  }
}

import { randomUUID } from "node:crypto";
import { Logger } from "../../logger";
import type { EmailBackend, EmailMessage, SendResult } from "../interfaces";

/**
 * Console backend - writes the message to stdout via the structured logger.
 *
 * Default in dev. The point: zero setup. The user sees the email content
 * in `journalctl -u playcode-backend` (or `pnpm dev` output) without
 * needing API keys or a sandbox account anywhere.
 *
 * The downside: emails don't actually leave the box. That's the deal.
 * Switch `MAIL_TRANSPORT=resend` + supply a `RESEND_API_KEY` to send for real.
 */
export class ConsoleBackend implements EmailBackend {
  constructor(private readonly logger: Logger) {}

  async send(msg: EmailMessage): Promise<SendResult> {
    const id = randomUUID();
    const recipients = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;

    this.logger.log(
      [
        "",
        "━━━━━━━━━━━━━━━━ EMAIL (console transport) ━━━━━━━━━━━━━━━━",
        `From:    ${msg.from ?? "(default MAIL_FROM)"}`,
        `To:      ${recipients}`,
        `Subject: ${msg.subject}`,
        msg.replyTo ? `Reply-To: ${msg.replyTo}` : "",
        "",
        msg.text ?? msg.html ?? "(empty body)",
        "",
        `Message-ID: ${id}`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    return { messageId: id, transport: "console" };
  }
}

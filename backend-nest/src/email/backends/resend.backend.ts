import { Resend, type CreateEmailOptions } from "resend";
import { Logger } from "../../logger";
import type { EmailBackend, EmailMessage, SendResult } from "../interfaces";

/**
 * Resend backend - production transport via https://resend.com.
 *
 * Setup:
 *   1. Sign up at resend.com (free tier: 3k emails/month, 100/day)
 *   2. Verify your sending domain (DNS records they generate)
 *   3. Set MAIL_TRANSPORT=resend, RESEND_API_KEY=re_..., MAIL_FROM=you@your-domain.com
 *
 * Resend's API is a thin wrapper over standard SMTP-style fields. We map
 * EmailMessage 1:1 to their request shape.
 */
export class ResendBackend implements EmailBackend {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly defaultFrom: string,
    private readonly logger: Logger,
  ) {
    if (!apiKey) {
      throw new Error("ResendBackend requires RESEND_API_KEY to be set");
    }
    this.client = new Resend(apiKey);
  }

  async send(msg: EmailMessage): Promise<SendResult> {
    // Resend's SDK exposes `text`/`html` as a discriminated union - at least
    // one must be a string. Our `EmailMessage` enforces that too, but the
    // narrowing doesn't survive object-literal construction, so we build the
    // payload via spread to drop undefined fields.
    const payload = {
      from: msg.from ?? this.defaultFrom,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      ...(msg.html ? { html: msg.html } : {}),
      ...(msg.text ? { text: msg.text } : {}),
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
      ...(msg.headers ? { headers: msg.headers } : {}),
    } as CreateEmailOptions;

    const { data, error } = await this.client.emails.send(payload);

    if (error) {
      this.logger.error(`Resend send failed: ${error.message}`);
      throw new Error(`Resend: ${error.message}`);
    }

    return { messageId: data?.id ?? "unknown", transport: "resend" };
  }
}

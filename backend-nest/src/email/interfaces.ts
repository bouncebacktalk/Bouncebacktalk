/**
 * Email transport interfaces. One backend, one method, plain HTML/text
 * bodies. Templates live in EmailTemplateService; async delivery lives in
 * QueueModule's EmailQueue.
 */

interface EmailMessageBase {
  /** Override `MAIL_FROM` for this send if set. Otherwise defaults to env. */
  from?: string;
  /** Single recipient or list. Both strings ('a@x') and `Name <a@x>` work. */
  to: string | string[];
  subject: string;
  /** Reply-to header. Useful for reset-password type flows. */
  replyTo?: string;
  /** Custom headers (e.g. `X-Entity-Ref-ID` for tracing). */
  headers?: Record<string, string>;
}

/**
 * Either `html` or `text` (or both) must be provided - every transport (incl.
 * Resend's SDK) rejects bodyless emails. Express the constraint in the type.
 */
export type EmailMessage =
  | (EmailMessageBase & { html: string; text?: string })
  | (EmailMessageBase & { html?: string; text: string });

export interface SendResult {
  /** Provider-supplied id (or a synthetic uuid for the console backend). */
  messageId: string;
  transport: "console" | "resend";
}

export interface EmailBackend {
  send(msg: EmailMessage): Promise<SendResult>;
}

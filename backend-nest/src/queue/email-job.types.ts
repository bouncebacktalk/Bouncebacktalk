import type { EmailMessage } from "../email";

export interface PasswordResetEmailJob {
  kind: "password-reset";
  to: string;
  appName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface LeadNotificationEmailJob {
  kind: "lead-notification";
  to: string | string[];
  appName: string;
  leadId: number;
  name: string | null;
  email: string;
  company: string | null;
  message: string;
  source: string;
  status: "NEW" | "CONTACTED" | "ARCHIVED";
  receivedAt: string;
}

export interface RawEmailJob {
  kind: "raw";
  message: EmailMessage;
}

export interface HealthCheckJob {
  kind: "healthcheck";
  requestedAt: string;
}

export type EmailJob =
  | PasswordResetEmailJob
  | LeadNotificationEmailJob
  | RawEmailJob
  | HealthCheckJob;

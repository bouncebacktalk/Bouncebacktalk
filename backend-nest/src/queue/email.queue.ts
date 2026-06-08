import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { JobsOptions, Queue } from "bullmq";
import type { EmailMessage } from "../email";
import type {
  EmailJob,
  LeadNotificationEmailJob,
  PasswordResetEmailJob,
} from "./email-job.types";
import { EMAIL_QUEUE } from "./queue.constants";

const DEFAULT_EMAIL_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1_000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86400, count: 1000 },
};

@Injectable()
export class EmailQueue {
  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailJob>,
  ) {}

  async enqueuePasswordReset(input: Omit<PasswordResetEmailJob, "kind">) {
    return this.queue.add(
      "password-reset",
      { kind: "password-reset", ...input },
      DEFAULT_EMAIL_JOB_OPTIONS,
    );
  }

  async enqueueLeadNotification(
    input: Omit<LeadNotificationEmailJob, "kind">,
    options?: JobsOptions,
  ) {
    return this.queue.add(
      "lead-notification",
      { kind: "lead-notification", ...input },
      { ...DEFAULT_EMAIL_JOB_OPTIONS, ...options },
    );
  }

  async enqueueRaw(message: EmailMessage, options?: JobsOptions) {
    return this.queue.add(
      "raw",
      { kind: "raw", message },
      { ...DEFAULT_EMAIL_JOB_OPTIONS, ...options },
    );
  }

  async enqueueHealthCheck() {
    return this.queue.add(
      "healthcheck",
      { kind: "healthcheck", requestedAt: new Date().toISOString() },
      {
        attempts: 1,
        removeOnComplete: { age: 300, count: 50 },
        removeOnFail: { age: 300, count: 50 },
      },
    );
  }
}

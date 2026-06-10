import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma";
import { EmailQueue } from "./queue";

/**
 * Health endpoints.
 *
 *   GET /api/health         - basic liveness, returns service uptime
 *   GET /api/health/ready   - deploy readiness, checks DB and queue
 *
 *   GET /api/health/db      - Prisma/Postgres check
 *   GET /api/health/queue   - BullMQ enqueue check
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueue,
  ) {}

  @Get()
  health() {
    return {
      status: "ok",
      service: "playcode-bouncebacktalk-app-backend",
      uptime: process.uptime(),
    };
  }

  @Get("ready")
  ready() {
    return { status: "ok" };
  }

  @Get("db")
  async db() {
    const result = await this.prisma.$queryRaw<
      { ok: number }[]
    >`SELECT 1 as ok`;
    return { db: "ok", result };
  }

  @Get("queue")
  async queueCheck() {
    const job = await this.emailQueue.enqueueHealthCheck();
    return { queue: "ok", jobId: job.id };
  }

  private async checkDb() {
    try {
      await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
      return { status: "ok" as const };
    } catch (err) {
      return {
        status: "error" as const,
        message: err instanceof Error ? err.message : "Database check failed",
      };
    }
  }

  private async checkQueue() {
    try {
      const job = await this.emailQueue.enqueueHealthCheck();
      return { status: "ok" as const, jobId: String(job.id ?? "") };
    } catch (err) {
      return {
        status: "error" as const,
        message: err instanceof Error ? err.message : "Queue check failed",
      };
    }
  }
}

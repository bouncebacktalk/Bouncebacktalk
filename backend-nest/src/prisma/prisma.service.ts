import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Logger } from "../logger";

/**
 * PrismaService - thin wrapper around PrismaClient that hooks into Nest's
 * lifecycle so connections close cleanly on shutdown.
 *
 * Prisma 7 requires a driver adapter (or Accelerate) for runtime
 * connections; @prisma/adapter-pg wraps node-postgres so the same
 * DATABASE_URL that prisma.config.ts feeds to migrate is reused here.
 *
 * Usage:
 *   constructor(private readonly prisma: PrismaService) {}
 *   await this.prisma.lead.findMany()
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: Logger) {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: ["warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Prisma disconnected");
  }
}

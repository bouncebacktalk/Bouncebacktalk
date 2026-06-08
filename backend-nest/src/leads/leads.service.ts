import { Injectable, NotFoundException } from "@nestjs/common";
import type { Lead, LeadStatus } from "@prisma/client";
import { ConfigService } from "../config";
import { Logger } from "../logger";
import { PrismaService } from "../prisma";
import { EmailQueue } from "../queue";
import type {
  CreateLeadDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
} from "./dto/lead.dto";

export interface PublicLeadResponse {
  ok: true;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueue,
    private readonly logger: Logger,
  ) {}

  async createPublic(input: CreateLeadDto): Promise<PublicLeadResponse> {
    if (input.website?.trim()) {
      this.logger.warn("lead honeypot filled; accepting without storing");
      return { ok: true };
    }

    const lead = await this.prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        source: input.source,
      },
    });

    await this.notifyAdmins(lead);
    return { ok: true };
  }

  async list(input: ListLeadsQueryDto): Promise<Lead[]> {
    return this.prisma.lead.findMany({
      where: input.status ? { status: input.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: input.limit,
    });
  }

  async getOne(id: number): Promise<Lead> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  /**
   * Change the status of many leads in a single statement. `updateMany` is
   * atomic and one round-trip - we never loop per-id. Unknown ids are silently
   * skipped by Prisma, so the returned `count` is the source of truth for how
   * many rows actually changed.
   */
  async bulkUpdateStatus(
    ids: number[],
    status: LeadStatus,
  ): Promise<{ count: number }> {
    const result = await this.prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    this.logger.log(`bulk status -> ${status} for ${result.count} lead(s)`);
    return { count: result.count };
  }

  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    const result = await this.prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });
    this.logger.log(`bulk delete removed ${result.count} lead(s)`);
    return { count: result.count };
  }

  async update(id: number, input: UpdateLeadDto): Promise<Lead> {
    await this.ensureExists(id);
    return this.prisma.lead.update({
      where: { id },
      data: { status: input.status },
    });
  }

  async delete(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.lead.delete({ where: { id } });
  }

  private async ensureExists(id: number): Promise<void> {
    const exists = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Lead not found");
  }

  private async notifyAdmins(lead: Lead): Promise<void> {
    const admins = this.config.adminEmails;
    if (admins.length === 0) {
      this.logger.warn(
        `lead ${lead.id} stored without email notification; ADMIN_EMAILS is empty`,
      );
      return;
    }

    await this.emailQueue
      .enqueueLeadNotification({
        to: admins,
        appName: "{{PROJECT_TITLE}}",
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        message: lead.message,
        source: lead.source,
        status: lead.status as LeadStatus,
        receivedAt: lead.createdAt.toISOString(),
      })
      .catch((err: unknown) => {
        this.logger.error(
          `lead ${lead.id} stored but notification enqueue failed`,
          err instanceof Error ? err.stack : undefined,
          { leadId: lead.id },
        );
      });
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateBetDto, UpdateBetDto, BetFilterDto } from './dto/bets.dto';
import { BetStatus, BetType, Prisma } from '@prisma/client';

@Injectable()
export class BetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateBetDto) {
    const status: BetStatus = dto.status ?? 'PENDING';
    const stake = Number(dto.stake);
    const payout = Number(dto.payout);
    const profit = this.calcProfit(status, stake, payout);
    return this.prisma.bet.create({
      data: {
        userId,
        type: dto.type,
        status,
        sportsbook: dto.sportsbook,
        stake: dto.stake,
        odds: dto.odds,
        payout: dto.payout,
        profit,
        notes: dto.notes,
        screenshotUrl: dto.screenshotUrl,
        betDate: dto.betDate ? new Date(dto.betDate) : new Date(),
        settledAt: status !== 'PENDING' ? new Date(dto.betDate ?? Date.now()) : null,
        legs: dto.legs?.length
          ? { create: dto.legs.map(l => ({ ...l })) }
          : undefined,
      },
      include: { legs: true },
    });
  }

  async findAll(userId: number, filter: BetFilterDto) {
    const where: Prisma.BetWhereInput = { userId };
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.sportsbook) where.sportsbook = { contains: filter.sportsbook, mode: 'insensitive' };
    if (filter.from || filter.to) {
      where.betDate = {};
      if (filter.from) (where.betDate as any).gte = new Date(filter.from);
      if (filter.to) (where.betDate as any).lte = new Date(filter.to + 'T23:59:59Z');
    }
    return this.prisma.bet.findMany({
      where,
      include: { legs: true },
      orderBy: { betDate: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const bet = await this.prisma.bet.findUnique({ where: { id }, include: { legs: true } });
    if (!bet) throw new NotFoundException('Bet not found');
    if (bet.userId !== userId) throw new ForbiddenException();
    return bet;
  }

  async update(userId: number, id: number, dto: UpdateBetDto) {
    const bet = await this.findOne(userId, id);
    const newStatus = dto.status ?? bet.status;
    const newStake = dto.stake !== undefined ? dto.stake : Number(bet.stake);
    const newPayout = dto.payout !== undefined ? dto.payout : Number(bet.payout);
    const profit = this.calcProfit(newStatus, newStake, newPayout);
    return this.prisma.bet.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.sportsbook !== undefined && { sportsbook: dto.sportsbook }),
        ...(dto.stake !== undefined && { stake: dto.stake }),
        ...(dto.odds !== undefined && { odds: dto.odds }),
        ...(dto.payout !== undefined && { payout: dto.payout }),
        ...(dto.betDate && { betDate: new Date(dto.betDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        profit: profit,
        settledAt: dto.status && dto.status !== 'PENDING' ? new Date() : bet.settledAt,
      },
      include: { legs: true },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    return this.prisma.bet.delete({ where: { id } });
  }

  async getStats(userId: number) {
    const all = await this.prisma.bet.findMany({
      where: { userId },
      select: { status: true, stake: true, profit: true, payout: true, betDate: true, type: true },
    });

    const now = new Date();
    const todayPacific = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const todayStart = new Date(todayPacific + "T00:00:00.000Z");
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const calc = (bets: typeof all) => {
      const settled = bets.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'PUSH');
      const won = settled.filter(b => b.status === 'WON');
      const totalStake = settled.reduce((s, b) => s + Number(b.stake), 0);
      const totalProfit = settled.reduce((s, b) => s + (b.profit ? Number(b.profit) : 0), 0);
      const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;
      return {
        bets: settled.length,
        won: won.length,
        lost: settled.filter(b => b.status === 'LOST').length,
        pending: bets.filter(b => b.status === 'PENDING').length,
        profit: totalProfit,
        stake: totalStake,
        roi: Math.round(roi * 100) / 100,
        winPct: settled.length > 0 ? Math.round((won.length / settled.length) * 1000) / 10 : 0,
      };
    };

    return {
      today: calc(all.filter(b => b.betDate >= todayStart)),
      week: calc(all.filter(b => b.betDate >= weekStart)),
      month: calc(all.filter(b => b.betDate >= monthStart)),
      year: calc(all.filter(b => b.betDate >= yearStart)),
      allTime: calc(all),
      pending: all.filter(b => b.status === 'PENDING').length,
    };
  }

  private calcProfit(status: BetStatus, stake: number, payout: number): number | null {
    if (status === 'PENDING') return null;
    if (status === 'WON') return payout - stake;
    if (status === 'LOST') return -stake;
    if (status === 'PUSH') return 0;
    return null;
  }
}

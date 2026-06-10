import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

const ALL_SPORTSBOOKS = [
  'DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'ESPN Bet',
  'Fanatics', 'Bet365', 'BetRivers', 'Barstool', 'WynnBET', 'Hard Rock',
];

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  async getSportsbooks(userId: number): Promise<string[]> {
    const pref = await this.prisma.userSportsbookPreference.findUnique({
      where: { userId },
    });
    return pref?.sportsbooks ?? ALL_SPORTSBOOKS;
  }

  async setSportsbooks(userId: number, sportsbooks: string[]): Promise<string[]> {
    await this.prisma.userSportsbookPreference.upsert({
      where: { userId },
      update: { sportsbooks },
      create: { userId, sportsbooks },
    });
    return sportsbooks;
  }

  getAllSportsbooks(): string[] {
    return ALL_SPORTSBOOKS;
  }
}

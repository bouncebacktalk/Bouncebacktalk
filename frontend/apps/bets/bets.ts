import { apiRequest, currentAccessToken } from '../api';

export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'PUSH' | 'VOID';
export type BetType = 'STRAIGHT' | 'PARLAY';

export interface BetLeg {
  id: number;
  sport?: string;
  league?: string;
  game?: string;
  betType?: string;
  pick?: string;
  line?: string;
  odds?: number;
  result?: BetStatus;
}

export interface Bet {
  id: number;
  type: BetType;
  status: BetStatus;
  sportsbook?: string;
  stake: string;
  odds: number;
  payout: string;
  profit?: string;
  notes?: string;
  screenshotUrl?: string;
  betDate: string;
  settledAt?: string;
  createdAt: string;
  legs: BetLeg[];
}

export interface BetStats {
  bets: number;
  won: number;
  lost: number;
  pending: number;
  profit: number;
  stake: number;
  roi: number;
  winPct: number;
}

export interface StatsResponse {
  today: BetStats;
  week: BetStats;
  month: BetStats;
  year: BetStats;
  allTime: BetStats;
  pending: number;
}

export interface CreateBetPayload {
  type: BetType;
  status?: BetStatus;
  sportsbook?: string;
  stake: number;
  odds: number;
  payout: number;
  notes?: string;
  screenshotUrl?: string;
  betDate?: string;
  legs?: Array<{
    sport?: string;
    league?: string;
    game?: string;
    betType?: string;
    pick?: string;
    line?: string;
    odds?: number;
  }>;
}

export interface OcrResult {
  sportsbook?: string;
  stake?: number;
  odds?: number;
  payout?: number;
  betType?: string;
  status?: BetStatus;
  betDate?: string;
  legs?: Array<{
    pick?: string;
    odds?: number;
    betType?: string;
    game?: string;
    sport?: string;
    league?: string;
    line?: string;
    result?: BetStatus;
  }>;
}

export const betsApi = {
  list: (params?: Record<string, string>) =>
    apiRequest<Bet[]>('/api/bets' + (params ? '?' + new URLSearchParams(params) : '')),

  get: (id: number) => apiRequest<Bet>(`/api/bets/${id}`),

  create: (data: CreateBetPayload) =>
    apiRequest<Bet>('/api/bets', { method: 'POST', body: data }),

  update: (id: number, data: Partial<CreateBetPayload> & { status?: BetStatus }) =>
    apiRequest<Bet>(`/api/bets/${id}`, { method: 'PATCH', body: data }),

  remove: (id: number) => apiRequest<void>(`/api/bets/${id}`),

  stats: () => apiRequest<StatsResponse>('/api/bets/stats'),

  ocr: async (file: File): Promise<OcrResult> => {
    const form = new FormData();
    form.append('file', file);
    const token = currentAccessToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // OpenAI Vision can take 60–90s — use a 2-minute timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch('/api/bets/ocr', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: form,
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: `HTTP_${res.status}`, ...body } as any;
      }
      return res.json();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { error: 'TIMEOUT' } as any;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
};

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function formatMoney(n: number | string): string {
  const v = Number(n);
  const abs = Math.abs(v).toFixed(2);
  return v >= 0 ? `+$${abs}` : `-$${abs}`;
}

export function formatMoneyPlain(n: number | string): string {
  return `$${Math.abs(Number(n)).toFixed(2)}`;
}

export function statusColor(s: BetStatus) {
  return s === 'WON' ? 'text-green-400' :
    s === 'LOST' ? 'text-red-400' :
    s === 'PUSH' ? 'text-yellow-400' :
    s === 'VOID' ? 'text-muted-foreground' : 'text-blue-400';
}

export function statusBg(s: BetStatus) {
  return s === 'WON' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
    s === 'LOST' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
    s === 'PUSH' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
    s === 'VOID' ? 'bg-muted text-muted-foreground border-border' :
    'bg-blue-400/10 text-blue-400 border-blue-400/20';
}

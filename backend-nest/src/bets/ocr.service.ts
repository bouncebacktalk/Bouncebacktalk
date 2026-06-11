import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extract(file: Express.Multer.File): Promise<{
    sportsbook?: string;
    stake?: number;
    odds?: number;
    payout?: number;
    betType?: string;
    legs?: Array<{ pick?: string; odds?: number; betType?: string; game?: string; sport?: string; league?: string }>;
    raw?: string;
    error?: string;
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — OCR skipped');
      return { error: 'NO_API_KEY' };
    }

    try {
      const base64 = file.buffer.toString('base64');
      const mime = file.mimetype || 'image/jpeg';

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: `You are an expert sports betting slip parser. You can read screenshots from ANY sportsbook (DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers, ESPN Bet, Barstool, Hard Rock, WynnBET, and others). Extract all bet details accurately and return ONLY valid JSON.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Parse this sportsbook bet slip screenshot. Extract ALL available information and return ONLY valid JSON (no markdown, no explanation):

{
  "sportsbook": string or null,
  "stake": number (dollars wagered, e.g. 25.00),
  "odds": number (American odds for the whole bet, e.g. -110 or 12725),
  "payout": number (total payout if bet wins, INCLUDING stake, e.g. 47.73),
  "betType": "STRAIGHT" or "PARLAY",
  "status": "WON" or "LOST" or "PUSH" or "PENDING" (look for Won/Lost/Settled/Open/Pending on the slip — if clearly resolved use WON or LOST, otherwise PENDING),
  "betDate": string ISO date "YYYY-MM-DD" (the date the bet was placed — look for Ticket time, Date, Placed, or any visible date on the slip. Use that exact date. If not found use null),
  "legs": [
    {
      "pick": string (what was picked — team name, player name, over/under, etc.),
      "odds": number (American odds for this leg, or null),
      "betType": string (one of: "Spread", "Moneyline", "Total", "Prop", "Futures", or describe it),
      "game": string (matchup using short codes e.g. "NYY vs BOS" or "LAL vs GSW"),
      "sport": string (REQUIRED — always infer from teams/context: "MLB", "NBA", "NFL", "NHL", "NCAAB", "NCAAF"),
      "league": string (same as sport),
      "result": "WON" or "LOST" or "PUSH" or null (if individual leg result is shown)
    }
  ]
}

Rules:
- For a STRAIGHT bet, legs should have exactly 1 entry
- For a PARLAY, include ALL legs shown
- payout = total you receive if you win (stake + profit)
- If odds shown as decimal (e.g. 2.50), convert to American: (decimal - 1) * 100 if >= 2.0, or -100 / (decimal - 1) if < 2.0
- IMPORTANT: In JSON, NEVER prefix positive numbers with +. Write 12725 not +12725
- If a value truly cannot be found, use null
- picks like "Lakers -5.5", "Over 224.5", "LeBron James anytime scorer" are all valid picks
- Always include the team/player name in the pick field
- REQUIRED: always set "sport" on every leg — infer from team names (e.g. Yankees/Dodgers/Cubs → "MLB", Lakers/Celtics/Warriors → "NBA", Chiefs/Cowboys → "NFL", Maple Leafs/Rangers → "NHL"). Never leave sport null
- betDate: if ticket shows "2026/06/09 03:17:43 PM" extract "2026-06-09". Always YYYY-MM-DD format`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime};base64,${base64}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`OpenAI API error ${res.status}: ${errBody}`);
        return { error: `OPENAI_ERROR_${res.status}` };
      }

      const data = await res.json() as any;
      const raw = data.choices?.[0]?.message?.content ?? '';

      // Strip markdown code fences if present
      // Also strip leading + on numbers — GPT-4o writes +12725 which is invalid JSON
      const clean = raw
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```/g, '')
        .replace(/:\s*\+(\d)/g, ': $1')   // "odds": +12725  →  "odds": 12725
        .trim();
      const parsed = JSON.parse(clean);

      // Normalize: ensure legs is always an array
      if (!Array.isArray(parsed.legs)) {
        parsed.legs = [];
      }

      // For straight bets with no legs, create one from the top-level data
      if (parsed.betType === 'STRAIGHT' && parsed.legs.length === 0) {
        parsed.legs = [{ pick: null, odds: parsed.odds, betType: null, game: null }];
      }

      this.logger.log(`OCR success: ${parsed.betType}, ${parsed.legs?.length} legs, stake=$${parsed.stake}`);
      return { ...parsed, raw };
    } catch (err: any) {
      this.logger.error('OCR failed', err?.message ?? err);
      return { error: 'PARSE_ERROR' };
    }
  }
}

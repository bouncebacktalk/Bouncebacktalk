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
    legs?: Array<{ pick?: string; odds?: number; betType?: string; game?: string }>;
    raw?: string;
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — OCR skipped');
      return {};
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
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are a sports betting receipt parser. Extract the following from this sportsbook screenshot and return ONLY valid JSON (no markdown):
{
  "sportsbook": string or null,
  "stake": number (dollars wagered),
  "odds": number (American odds, e.g. -110 or +150),
  "payout": number (total payout including stake),
  "betType": "STRAIGHT" or "PARLAY",
  "legs": [
    {
      "pick": string (team/player picked),
      "odds": number (American),
      "betType": string (spread/moneyline/over/under/prop),
      "game": string (e.g. "Lakers vs Celtics")
    }
  ]
}
If a value cannot be determined, use null. For parlays include all legs.`,
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' },
                },
              ],
            },
          ],
        }),
      });

      const data = await res.json() as any;
      const raw = data.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
      return { ...parsed, raw };
    } catch (err) {
      this.logger.error('OCR failed', err);
      return {};
    }
  }
}

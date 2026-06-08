import { Injectable } from "@nestjs/common";
import { z } from "zod";

/**
 * Validated, typed environment for the backend.
 *
 * Pattern adapted from PlayCode's `backend-nest/src/config/config.service.ts`.
 * The whole point: parse `process.env` once at boot through a Zod schema,
 * fail-fast if anything is missing or wrong, and from then on read typed
 * fields off this service.
 *
 * Add new vars by extending `EnvSchema` below.
 */

const EnvBoolean = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return value;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3011),

  // ─── Database ──────────────────────────────────────────────────────────────
  // Required by PrismaModule. setup.sh writes this to .env.local.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ─── Redis ─────────────────────────────────────────────────────────────────
  // Required by QueueModule. setup.sh writes this to .env.local.
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CACHE_REDIS_DB: z.coerce.number().int().min(0).default(1),
  QUEUE_REDIS_DB: z.coerce.number().int().min(0).default(2),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  // Required by AuthModule. setup.sh generates strong random values:
  //   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  JWT_ACCESS_SECRET: z.string().min(64, "JWT_ACCESS_SECRET must be generated"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(64, "JWT_REFRESH_SECRET must be generated"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  AUTH_EXPOSE_ACCESS_TOKEN: EnvBoolean.default(true),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_SECURE: EnvBoolean.optional(),
  ADMIN_EMAILS: z.string().default(""),

  // Where the public frontend lives - used to build links in emails (password
  // reset, etc.). E.g. `https://your-app.example.com`. Override in `.env.local`
  // (or per-service env file); the default points at the local Vike dev server.
  PUBLIC_URL: z.string().default("http://localhost:3000"),

  // ─── Email ─────────────────────────────────────────────────────────────────
  // `console` writes the email to stdout (zero setup, perfect for dev).
  // `resend` requires RESEND_API_KEY and a verified sender domain.
  MAIL_TRANSPORT: z.enum(["console", "resend"]).default("console"),
  MAIL_FROM: z.string().default("{{PROJECT_TITLE}} <noreply@example.com>"),
  RESEND_API_KEY: z.string().default(""),

  // ─── Observability ─────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOGGER_NAMESPACES: z.string().default(""),
});

export type Env = z.infer<typeof EnvSchema>;

@Injectable()
export class ConfigService {
  readonly env: Env;

  constructor() {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment:\n${issues}`);
    }
    this.env = parsed.data;
  }

  get isProd(): boolean {
    return this.env.NODE_ENV === "production";
  }

  get adminEmails(): string[] {
    return this.env.ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Connection URL with the cache db number applied. */
  get cacheRedisUrl(): string {
    return this.withRedisDb(this.env.REDIS_URL, this.env.CACHE_REDIS_DB);
  }

  /** Connection URL with the queue db number applied. */
  get queueRedisUrl(): string {
    return this.withRedisDb(this.env.REDIS_URL, this.env.QUEUE_REDIS_DB);
  }

  private withRedisDb(url: string, db: number): string {
    if (!url) return "";
    const u = new URL(url);
    u.pathname = `/${db}`;
    return u.toString();
  }
}

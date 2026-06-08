import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

export function loadE2EEnv(): void {
  process.env.NODE_ENV = "test";

  for (const path of [
    resolve(process.cwd(), "../.env.test.local"),
    resolve(process.cwd(), "../.env.test"),
    resolve(process.cwd(), ".env.test.local"),
    resolve(process.cwd(), ".env.test"),
    resolve(process.cwd(), "../.env.local"),
    resolve(process.cwd(), ".env.local"),
  ]) {
    if (existsSync(path)) dotenv.config({ path, override: false });
  }

  process.env.JWT_ACCESS_SECRET ??=
    "test-access-secret-test-access-secret-test-access-secret-test-access-secret";
  process.env.JWT_REFRESH_SECRET ??=
    "test-refresh-secret-test-refresh-secret-test-refresh-secret-test-refresh-secret";
  process.env.JWT_ACCESS_TTL ??= "15m";
  process.env.JWT_REFRESH_TTL ??= "30d";
  process.env.AUTH_EXPOSE_ACCESS_TOKEN ??= "true";
  process.env.AUTH_COOKIE_SAME_SITE ??= "lax";
  process.env.AUTH_COOKIE_SECURE ??= "false";
  process.env.ADMIN_EMAILS ??= "admin@example.com";
  process.env.MAIL_TRANSPORT ??= "console";
  process.env.MAIL_FROM ??= "bouncebacktalk_app <noreply@example.com>";
  process.env.PUBLIC_URL ??= "http://localhost:3000";
}

export function assertE2EEnv(): void {
  const missing = ["DATABASE_URL", "REDIS_URL"].filter(
    (key) => !process.env[key],
  );
  if (missing.length === 0) return;
  throw new Error(
    `test:e2e requires ${missing.join(", ")}. Run pnpm test:smoke from the template root, or set the missing values in .env.test.local.`,
  );
}

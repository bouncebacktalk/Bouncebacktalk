import { Inject, Injectable, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import * as winston from "winston";

/**
 * Per-namespace structured logger. Each Nest provider that injects `Logger`
 * gets a transient instance that auto-tags every log line with the namespace
 * (`UserService`, `HealthController`, etc.) so journalctl filters by
 * namespace cleanly.
 *
 * Filter what gets logged at runtime via env:
 *   LOG_LEVEL=info | debug | warn | error
 *   LOGGER_NAMESPACES=UserService,HealthController   # comma-separated allowlist
 */

const LEVEL = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const NAMESPACE_FILTER = (process.env.LOGGER_NAMESPACES ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

@Injectable({ scope: Scope.TRANSIENT })
export class Logger {
  private readonly winston: winston.Logger;
  private readonly namespace: string;

  constructor(@Inject(INQUIRER) parent: object) {
    this.namespace = parent?.constructor?.name ?? "Unknown";

    this.winston = winston.createLogger({
      level: LEVEL,
      defaultMeta: { namespace: this.namespace },
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV === "production"
              ? winston.format.json()
              : devFormat(),
        }),
      ],
    });
  }

  log(message: unknown, ...meta: unknown[]): void {
    if (!this.shouldLog()) return;
    this.winston.info(this.toString(message), { meta });
  }

  debug(message: unknown, ...meta: unknown[]): void {
    if (!this.shouldLog()) return;
    this.winston.debug(this.toString(message), { meta });
  }

  warn(message: unknown, ...meta: unknown[]): void {
    if (!this.shouldLog()) return;
    this.winston.warn(this.toString(message), { meta });
  }

  error(message: unknown | Error, trace?: string, ...meta: unknown[]): void {
    if (!this.shouldLog()) return;
    if (message instanceof Error) {
      this.winston.error(message.message, {
        stack: trace ?? message.stack,
        meta,
      });
      return;
    }
    this.winston.error(this.toString(message), { stack: trace, meta });
  }

  private shouldLog(): boolean {
    if (NAMESPACE_FILTER.length === 0) return true;
    return NAMESPACE_FILTER.includes(this.namespace);
  }

  private toString(value: unknown): string {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}

/** Dev-friendly console format: timestamp + namespace + message. */
function devFormat() {
  return winston.format.combine(
    winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
    winston.format.colorize({ level: true }),
    winston.format.printf((info) => {
      const ns = info.namespace ?? "?";
      return `${info.timestamp} ${info.level} [${ns}] ${info.message}`;
    }),
  );
}

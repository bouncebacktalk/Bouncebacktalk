import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Logger } from "../logger";
import type { ApiIssue } from "./api-issue";
import type { RequestWithId } from "./request-id.middleware";

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
  issues?: ApiIssue[];
  checks?: unknown;
}

interface NormalizedException {
  statusCode: number;
  error: string;
  message: string;
  issues?: ApiIssue[];
  checks?: unknown;
  logInternal: boolean;
}

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();
    const normalized = normalizeException(exception);
    const requestId = req.requestId ?? "unknown";

    if (normalized.logInternal) {
      this.logger.error(
        "Unhandled API exception",
        exception instanceof Error ? exception.stack : undefined,
        {
          requestId,
          method: req.method,
          path: requestPath(req),
          statusCode: normalized.statusCode,
          error: normalized.error,
        },
      );
    }

    const body: ApiErrorResponse = {
      statusCode: normalized.statusCode,
      error: normalized.error,
      message: normalized.message,
      requestId,
      ...(normalized.issues?.length ? { issues: normalized.issues } : {}),
      ...(normalized.checks ? { checks: normalized.checks } : {}),
    };

    res.status(normalized.statusCode).json(body);
  }
}

export function normalizeException(exception: unknown): NormalizedException {
  if (isPrismaUniqueConstraintError(exception)) {
    return {
      statusCode: HttpStatus.CONFLICT,
      error: "CONFLICT",
      message: "Resource already exists.",
      logInternal: false,
    };
  }

  if (exception instanceof HttpException) {
    return normalizeHttpException(exception);
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: "INTERNAL_ERROR",
    message: "Internal server error.",
    logInternal: true,
  };
}

function normalizeHttpException(exception: HttpException): NormalizedException {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (isRecord(response)) {
    const rawError = stringValue(response.error);
    const error = apiErrorCode(rawError, statusCode);
    const issues = issuesFromValue(response.issues);
    return {
      statusCode,
      error,
      message: messageFromValue(response.message, exception.message),
      ...(issues.length ? { issues } : {}),
      ...(response.checks ? { checks: response.checks } : {}),
      logInternal: statusCode >= 500,
    };
  }

  return {
    statusCode,
    error: statusCodeToErrorCode(statusCode),
    message:
      typeof response === "string"
        ? response
        : safeHttpMessage(statusCode, exception.message),
    logInternal: statusCode >= 500,
  };
}

function apiErrorCode(
  rawError: string | undefined,
  statusCode: number,
): string {
  if (rawError && /^[A-Z0-9_]+$/.test(rawError)) return rawError;
  return statusCodeToErrorCode(statusCode);
}

function statusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.SERVICE_UNAVAILABLE:
      return "NOT_READY";
    default:
      return statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED";
  }
}

function safeHttpMessage(statusCode: number, message: string): string {
  return statusCode >= 500 ? "Internal server error." : message;
}

function messageFromValue(value: unknown, fallback: string): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string") return value;
  return fallback;
}

function issuesFromValue(value: unknown): ApiIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((issue): ApiIssue | null => {
      if (!isRecord(issue) || typeof issue.message !== "string") return null;
      return {
        path: pathToString(issue.path),
        message: issue.message,
        ...(typeof issue.code === "string" ? { code: issue.code } : {}),
      };
    })
    .filter((issue): issue is ApiIssue => issue !== null);
}

function pathToString(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(".");
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isPrismaUniqueConstraintError(value: unknown): boolean {
  return isRecord(value) && value.code === "P2002";
}

function requestPath(req: Request): string {
  return req.originalUrl || req.url || "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

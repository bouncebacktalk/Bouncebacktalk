import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestWithId extends Request {
  requestId: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = requestIdFromHeader(req.headers[REQUEST_ID_HEADER]);
    (req as RequestWithId).requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}

export function requestIdFromHeader(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate === "string" && isSafeRequestId(candidate)) {
    return candidate;
  }
  return `req_${randomUUID()}`;
}

function isSafeRequestId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && /^[\w:.-]+$/.test(value);
}

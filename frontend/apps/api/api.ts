export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
    readonly issues: ApiIssue[] = apiIssues(body),
    readonly code: string | undefined = apiErrorCode(body),
    readonly requestId: string | undefined = apiRequestId(body),
  ) {
    super(message);
    this.name = "ApiError";
  }

  get fieldErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const key = issue.path || "form";
      errors[key] ??= [];
      errors[key].push(issue.message);
    }
    return errors;
  }
}

export interface ApiIssue {
  path: string;
  message: string;
  code?: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRefresh?: boolean;
}

const ACCESS_TOKEN_STORAGE_KEY = "playcode-bouncebacktalk-app:auth:access-token";

let memoryAccessToken: string | null = null;

/**
 * Browser API client for the NestJS backend.
 *
 * Always call the backend through the relative `/api` prefix. In the cloud VM
 * Traefik routes `/api/*` to backend-nest and everything else to Vike. Do not
 * hard-code localhost in browser code.
 *
 * Auth is cookie-first. For PlayCode preview iframes, where third-party cookie
 * rules can block HTTP-only cookies, the client also sends a short-lived
 * bearer access token when the auth endpoint exposes one.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(apiPath(path), buildRequestInit(options));

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !isAuthRefreshPath(path)
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retry = await fetch(
        apiPath(path),
        buildRequestInit({ ...options, skipAuthRefresh: true }),
      );
      return parseResponse<T>(retry);
    }
  }

  return parseResponse<T>(response);
}

export function apiGet<T>(path: string, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
) {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
) {
  return apiRequest<T>(path, { ...options, method: "PATCH", body });
}

export function apiDelete<T>(path: string, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}

export function apiPath(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath.startsWith("/api/") ? cleanPath : `/api${cleanPath}`;
}

export function rememberAccessToken(accessToken: string | undefined): void {
  if (!accessToken) return;
  if (!isBrowser()) return;
  memoryAccessToken = accessToken;
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function clearAccessToken(): void {
  if (!isBrowser()) return;
  memoryAccessToken = null;
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function currentAccessToken(): string | null {
  if (!isBrowser()) return null;
  if (memoryAccessToken) return memoryAccessToken;
  const storage = getStorage();
  if (!storage) return null;
  memoryAccessToken = storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return memoryAccessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    clearAccessToken();
    return false;
  }

  const body = await parseResponse<{ accessToken?: string }>(response);
  rememberAccessToken(body?.accessToken);
  return true;
}

function buildRequestInit(options: ApiRequestOptions): RequestInit {
  const { body, skipAuthRefresh: _skipAuthRefresh, headers, ...rest } = options;
  const hasBody = body !== undefined;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept"))
    requestHeaders.set("Accept", "application/json");
  if (hasBody && !requestHeaders.has("Content-Type"))
    requestHeaders.set("Content-Type", "application/json");

  const accessToken = currentAccessToken();
  if (accessToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return {
    ...rest,
    credentials: rest.credentials ?? "include",
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? parseJson(text) : undefined;

  if (!response.ok) {
    const issues = apiIssues(body);
    throw new ApiError(
      response.status,
      errorMessage(body, response.statusText, issues),
      body,
      issues,
    );
  }

  return body as T;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function apiIssues(body: unknown): ApiIssue[] {
  if (!isRecord(body)) return [];

  const direct = issuesFromValue(body.issues);
  if (direct.length) return direct;

  const nestedError = isRecord(body.error) ? body.error : undefined;
  const nested = issuesFromValue(nestedError?.issues);
  if (nested.length) return nested;

  const errors = issuesFromValue(body.errors);
  if (errors.length) return errors;

  if (Array.isArray(body.message)) {
    return body.message
      .map((message) =>
        typeof message === "string" ? { path: "", message } : null,
      )
      .filter((issue): issue is ApiIssue => issue !== null);
  }

  return [];
}

function issuesFromValue(value: unknown): ApiIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toApiIssue)
    .filter((issue): issue is ApiIssue => issue !== null);
}

function toApiIssue(value: unknown): ApiIssue | null {
  if (typeof value === "string") {
    return { path: "", message: value };
  }

  if (!isRecord(value) || typeof value.message !== "string") return null;

  return {
    path: pathToString(value.path ?? value.field),
    message: value.message,
    code: typeof value.code === "string" ? value.code : undefined,
  };
}

function pathToString(path: unknown): string {
  if (Array.isArray(path)) return path.map(String).join(".");
  if (typeof path === "string") return path;
  if (typeof path === "number") return String(path);
  return "";
}

function errorMessage(
  body: unknown,
  fallback: string,
  issues: ApiIssue[],
): string {
  if (issues.length) return issues.map(formatIssueMessage).join("; ");

  if (isRecord(body) && "message" in body) {
    const message = body.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  if (isRecord(body) && typeof body.error === "string") return body.error;
  return fallback || "Request failed";
}

export function apiErrorCode(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  return typeof body.error === "string" ? body.error : undefined;
}

export function apiRequestId(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  return typeof body.requestId === "string" ? body.requestId : undefined;
}

function formatIssueMessage(issue: ApiIssue): string {
  const label = fieldLabel(issue.path);
  return label ? `${label}: ${issue.message}` : issue.message;
}

function fieldLabel(path: string): string {
  const parts = path.split(".").filter(Boolean);
  const leaf = parts[parts.length - 1];
  if (!leaf) return "";
  const words = leaf
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isAuthRefreshPath(path: string): boolean {
  return apiPath(path) === "/api/auth/refresh";
}

function getStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    const storage = window.localStorage;
    if (
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" ||
      typeof storage.removeItem !== "function"
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

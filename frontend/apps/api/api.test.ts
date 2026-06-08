import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiIssues,
  apiPost,
  apiPath,
  apiRequest,
  clearAccessToken,
  rememberAccessToken,
} from "./api";

describe("api client", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it("routes every backend call through the same-origin /api prefix", () => {
    expect(apiPath("/users/me")).toBe("/api/users/me");
    expect(apiPath("users/me")).toBe("/api/users/me");
    expect(apiPath("/api/users/me")).toBe("/api/users/me");
  });

  it("exposes method helpers without hiding fetch semantics", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/leads", { email: "hello@example.com" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "hello@example.com" }),
      }),
    );
  });

  it("sends cookies and retries once after refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: "fresh-token", user: { id: 1 } }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ ok: boolean }>("/users/me");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/users/me",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/refresh",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/users/me",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(headerAt(fetchMock, 3, "Authorization")).toBe("Bearer fresh-token");
  });

  it("uses the bearer fallback when preview cookies are blocked", async () => {
    rememberAccessToken("preview-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/users/me");

    expect(headerAt(fetchMock, 1, "Authorization")).toBe(
      "Bearer preview-token",
    );
  });

  it("formats Zod validation issues into a useful ApiError", async () => {
    const responseBody = {
      statusCode: 400,
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      requestId: "req_test",
      issues: [
        {
          path: "email",
          message: "Enter a valid email address.",
          code: "invalid_string",
        },
        {
          path: "password",
          message: "Use at least 8 characters.",
          code: "too_small",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(responseBody, 400));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/auth/register", {
        method: "POST",
        body: { email: "bad", password: "short" },
      }),
    ).rejects.toMatchObject({
      status: 400,
      message:
        "Email: Enter a valid email address.; Password: Use at least 8 characters.",
      issues: responseBody.issues,
      code: "VALIDATION_ERROR",
      requestId: "req_test",
    });
  });

  it("normalizes common validation error response shapes", () => {
    expect(
      apiIssues({
        error: {
          issues: [
            {
              path: ["profile", "displayName"],
              message: "Display name is required.",
              code: "too_small",
            },
          ],
        },
      }),
    ).toEqual([
      {
        path: "profile.displayName",
        message: "Display name is required.",
        code: "too_small",
      },
    ]);

    const apiError = new ApiError(400, "Bad Request", {
      message: ["First problem", "Second problem"],
    });
    expect(apiError.issues).toEqual([
      { path: "", message: "First problem" },
      { path: "", message: "Second problem" },
    ]);
  });
});

function headerAt(
  fetchMock: ReturnType<typeof vi.fn>,
  callNumber: number,
  header: string,
): string | null {
  const init = fetchMock.mock.calls[callNumber - 1]?.[1] as
    | RequestInit
    | undefined;
  return init?.headers instanceof Headers ? init.headers.get(header) : null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

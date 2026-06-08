import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { RefreshToken, User } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/prisma";
import { assertE2EEnv, loadE2EEnv } from "./helpers/e2e-env";
import { createE2EApp } from "./helpers/test-app";

loadE2EEnv();

interface AuthBody {
  user: {
    id: number;
    email: string;
    name: string | null;
    createdAt: string;
    updatedAt: string;
    isAdmin: boolean;
  };
  accessToken: string;
}

describe("Auth flow (e2e)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  const emails = new Set<string>();

  beforeAll(async () => {
    assertE2EEnv();

    app = await createE2EApp();
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await deleteUsersByEmail([...emails]);
    emails.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("registers a user, persists refresh tokens, and authenticates through cookies or bearer fallback", async () => {
    const email = uniqueEmail("register");
    const register = await registerUser(email);

    expect(register.status).toBe(201);
    const body = (await register.json()) as AuthBody;
    expect(body.user.email).toBe(email);
    expect(typeof body.user.isAdmin).toBe("boolean");
    expect(body.accessToken).toContain(".");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeTruthy();
    expect(
      await prisma.refreshToken.count({ where: { userId: user?.id } }),
    ).toBe(1);

    const cookies = setCookieHeaders(register);
    expectCookie(cookies, "access_token", [
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
    ]);
    expectCookie(cookies, "refresh_token", [
      "HttpOnly",
      "Path=/api/auth/refresh",
      "SameSite=Lax",
    ]);

    const byCookie = await get("/api/users/me", {
      Cookie: cookieHeader(cookies),
    });
    expect(byCookie.status).toBe(200);
    expect(((await byCookie.json()) as AuthBody["user"]).email).toBe(email);

    const byBearer = await get("/api/users/me", {
      Authorization: `Bearer ${body.accessToken}`,
    });
    expect(byBearer.status).toBe(200);
    expect(((await byBearer.json()) as AuthBody["user"]).email).toBe(email);
  });

  it("logs in with password and rotates refresh tokens", async () => {
    const email = uniqueEmail("refresh");
    await registerUser(email);
    const login = await post("/api/auth/login", {
      email,
      password: "password",
    });
    expect(login.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const beforeRefresh = await refreshTokensFor(user);
    expect(beforeRefresh.filter((row) => row.revokedAt === null)).toHaveLength(
      2,
    );

    const refresh = await post("/api/auth/refresh", undefined, {
      Cookie: cookieHeader(setCookieHeaders(login)),
    });
    expect(refresh.status).toBe(201);

    const afterRefresh = await refreshTokensFor(user);
    expect(afterRefresh).toHaveLength(3);
    expect(afterRefresh.filter((row) => row.revokedAt === null)).toHaveLength(
      2,
    );
    expect(afterRefresh.filter((row) => row.revokedAt !== null)).toHaveLength(
      1,
    );
  });

  it("logs out and revokes the presented refresh token", async () => {
    const email = uniqueEmail("logout");
    const register = await registerUser(email);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const cookies = setCookieHeaders(register);

    const logout = await post("/api/auth/logout", undefined, {
      Cookie: cookieHeader(cookies),
    });
    expect(logout.status).toBe(204);

    const rows = await refreshTokensFor(user);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.revokedAt).toBeTruthy();

    const refreshAfterLogout = await post("/api/auth/refresh", undefined, {
      Cookie: cookieHeader(cookies),
    });
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("rejects duplicate registrations with a stable conflict response", async () => {
    const email = uniqueEmail("duplicate");
    expect((await registerUser(email)).status).toBe(201);

    const duplicate = await registerUser(email);

    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      statusCode: 409,
      error: "CONFLICT",
      message: "An account with this email already exists",
      requestId: expect.any(String),
    });
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("returns stable Zod validation issues for invalid auth input", async () => {
    const response = await post("/api/auth/register", {
      email: "not-an-email",
      password: "short",
      name: "",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: "email",
          message: "Enter a valid email address.",
        }),
        expect.objectContaining({
          path: "password",
          message: "Use at least 8 characters.",
        }),
        expect.objectContaining({
          path: "name",
        }),
      ]),
    });
  });

  function uniqueEmail(prefix: string): string {
    const email = `${prefix}-${randomUUID()}@example.com`;
    emails.add(email);
    return email;
  }

  async function registerUser(email: string): Promise<Response> {
    return post("/api/auth/register", {
      email,
      password: "password",
      name: "Test User",
    });
  }

  async function refreshTokensFor(user: User): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
  }

  async function get(path: string, headers?: Record<string, string>) {
    return fetch(`${baseUrl}${path}`, { headers });
  }

  async function post(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function deleteUsersByEmail(targetEmails: string[]) {
    if (targetEmails.length === 0) return;
    const users = await prisma.user.findMany({
      where: { email: { in: targetEmails } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) return;

    await prisma.passwordReset.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

function setCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const direct = headers.getSetCookie?.();
  if (direct?.length) return direct;

  const combined = response.headers.get("set-cookie");
  if (!combined) return [];
  return combined.split(/,(?=\s*[^;,\s]+=)/);
}

function cookieHeader(cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function expectCookie(cookies: string[], name: string, fragments: string[]) {
  const cookie = cookies.find((candidate) => candidate.startsWith(`${name}=`));
  expect(
    cookie,
    `missing ${name} cookie in ${cookies.join(" | ")}`,
  ).toBeTruthy();
  for (const fragment of fragments) {
    expect(cookie).toContain(fragment);
  }
}

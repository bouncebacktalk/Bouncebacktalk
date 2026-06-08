import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { User } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/prisma";
import { assertE2EEnv, loadE2EEnv } from "./helpers/e2e-env";
import { createE2EApp } from "./helpers/test-app";

loadE2EEnv();

interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  isAdmin: boolean;
}

interface AuthBody {
  user: PublicUser;
  accessToken: string;
}

/**
 * Member-management + account endpoints. Admin status is forced explicitly via
 * Prisma (not the bootstrap-first-user rule) so guard tests are deterministic
 * regardless of what other rows exist. Emails avoid ADMIN_EMAILS
 * (admin@example.com) so the DB flag is the only thing granting admin.
 */
describe("Users + account flow (e2e)", () => {
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

  it("lists members for admins, filters by search, forbids non-admins", async () => {
    const admin = await registerAdmin("admin-list");
    const member = await registerMember("member-list");

    const asAdmin = await get("/api/users", admin.accessToken);
    expect(asAdmin.status).toBe(200);
    const list = (await asAdmin.json()) as PublicUser[];
    expect(list.some((u) => u.id === admin.user.id)).toBe(true);
    expect(list.some((u) => u.id === member.user.id)).toBe(true);

    const memberToken = member.user.email.split("@")[0]!;
    const filtered = await get(
      `/api/users?search=${encodeURIComponent(memberToken)}`,
      admin.accessToken,
    );
    expect(filtered.status).toBe(200);
    const filteredList = (await filtered.json()) as PublicUser[];
    expect(filteredList).toHaveLength(1);
    expect(filteredList[0]!.id).toBe(member.user.id);

    const asMember = await get("/api/users", member.accessToken);
    expect(asMember.status).toBe(403);
  });

  it("promotes a member, then lets the original admin step down", async () => {
    const admin = await registerAdmin("admin-promote");
    const member = await registerMember("member-promote");

    const promote = await patch(
      `/api/users/${member.user.id}`,
      { isAdmin: true },
      admin.accessToken,
    );
    expect(promote.status).toBe(200);
    expect((await promote.json()) as PublicUser).toMatchObject({
      id: member.user.id,
      isAdmin: true,
    });

    // With two admins now, the first one stepping down is allowed.
    const stepDown = await patch(
      `/api/users/${admin.user.id}`,
      { isAdmin: false },
      admin.accessToken,
    );
    expect(stepDown.status).toBe(200);
    expect((await stepDown.json()) as PublicUser).toMatchObject({
      id: admin.user.id,
      isAdmin: false,
    });
  });

  it("refuses to demote the last admin", async () => {
    const solo = await registerAdmin("admin-solo");

    const response = await patch(
      `/api/users/${solo.user.id}`,
      { isAdmin: false },
      solo.accessToken,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("last admin"),
    });
  });

  it("updates the signed-in user's display name", async () => {
    const member = await registerMember("member-rename");

    const updated = await patch(
      "/api/users/me",
      { name: "Renamed Person" },
      member.accessToken,
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()) as PublicUser).toMatchObject({
      id: member.user.id,
      name: "Renamed Person",
    });

    const me = await get("/api/users/me", member.accessToken);
    expect((await me.json()) as PublicUser).toMatchObject({
      name: "Renamed Person",
    });
  });

  it("blocks self-delete, forbids non-admins, removes a member", async () => {
    const admin = await registerAdmin("admin-delete");
    const member = await registerMember("member-delete");

    const self = await del(`/api/users/${admin.user.id}`, admin.accessToken);
    expect(self.status).toBe(400);

    const byMember = await del(
      `/api/users/${admin.user.id}`,
      member.accessToken,
    );
    expect(byMember.status).toBe(403);

    const removed = await del(
      `/api/users/${member.user.id}`,
      admin.accessToken,
    );
    expect(removed.status).toBe(204);
    expect(
      await prisma.user.findUnique({ where: { id: member.user.id } }),
    ).toBeNull();
  });

  it("changes password: rejects wrong current, keeps session, rotates login", async () => {
    const email = uniqueEmail("changepw");
    const member = await registerMember("changepw", email, "password");

    const wrong = await postAuth(
      "/api/auth/change-password",
      { currentPassword: "not-the-password", newPassword: "brand-new-pass" },
      member.accessToken,
    );
    expect(wrong.status).toBe(401);

    const ok = await postAuth(
      "/api/auth/change-password",
      { currentPassword: "password", newPassword: "brand-new-pass" },
      member.accessToken,
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()) as AuthBody).toMatchObject({
      user: { id: member.user.id },
    });

    const oldLogin = await post("/api/auth/login", {
      email,
      password: "password",
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await post("/api/auth/login", {
      email,
      password: "brand-new-pass",
    });
    expect(newLogin.status).toBe(201);
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function uniqueEmail(prefix: string): string {
    return `${prefix}-${randomUUID()}@example.com`;
  }

  async function register(
    email: string,
    password = "password",
  ): Promise<AuthBody> {
    emails.add(email);
    const response = await post("/api/auth/register", {
      email,
      password,
      name: "Test User",
    });
    expect(response.status).toBe(201);
    return (await response.json()) as AuthBody;
  }

  /** Register and force the DB admin flag on, deterministically. */
  async function registerAdmin(prefix: string): Promise<AuthBody> {
    const body = await register(uniqueEmail(prefix));
    await prisma.user.update({
      where: { id: body.user.id },
      data: { isAdmin: true },
    });
    return body;
  }

  /** Register and force the DB admin flag off, deterministically. */
  async function registerMember(
    prefix: string,
    email = uniqueEmail(prefix),
    password = "password",
  ): Promise<AuthBody> {
    const body = await register(email, password);
    await prisma.user.update({
      where: { id: body.user.id },
      data: { isAdmin: false },
    });
    return body;
  }

  async function get(path: string, accessToken: string) {
    return fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async function patch(path: string, body: unknown, accessToken: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  async function del(path: string, accessToken: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async function post(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async function postAuth(path: string, body: unknown, accessToken: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  async function deleteUsersByEmail(targetEmails: string[]) {
    if (targetEmails.length === 0) return;
    const users = await prisma.user.findMany({
      where: { email: { in: targetEmails } },
      select: { id: true },
    });
    const userIds = users.map((user: Pick<User, "id">) => user.id);
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

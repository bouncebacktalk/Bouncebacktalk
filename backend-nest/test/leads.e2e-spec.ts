import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { Lead, User } from "@prisma/client";
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

describe("Leads flow (e2e)", () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  const emails = new Set<string>();
  const leadIds = new Set<number>();

  beforeAll(async () => {
    assertE2EEnv();
    app = await createE2EApp();
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await deleteLeads([...leadIds]);
    await deleteUsersByEmail([...emails]);
    leadIds.clear();
    emails.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("stores a public contact form submission", async () => {
    const response = await submitLead({
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      message: "Please tell me more about your product and pricing.",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });

    const lead = await prisma.lead.findFirstOrThrow({
      where: { email: "ada@example.com" },
    });
    leadIds.add(lead.id);
    expect(lead).toMatchObject({
      name: "Ada Lovelace",
      company: "Analytical Engines",
      status: "NEW",
    });
  });

  it("accepts honeypot spam without storing a lead", async () => {
    const before = await prisma.lead.count();
    const response = await submitLead({
      name: "Spam Bot",
      email: "spam@example.com",
      message: "This should not become a lead.",
      website: "https://spam.example.com",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(await prisma.lead.count()).toBe(before);
  });

  it("lets admins list, update, and delete leads", async () => {
    const admin = await register("admin@example.com");
    const created = await createLead("admin-visible");

    const list = await get("/api/leads", admin.accessToken);
    expect(list.status).toBe(200);
    const leads = (await list.json()) as Lead[];
    expect(leads.some((lead) => lead.id === created.id)).toBe(true);

    const update = await patch(
      `/api/leads/${created.id}`,
      { status: "CONTACTED" },
      admin.accessToken,
    );
    expect(update.status).toBe(200);
    expect((await update.json()) as Lead).toMatchObject({
      id: created.id,
      status: "CONTACTED",
    });

    const deleted = await del(`/api/leads/${created.id}`, admin.accessToken);
    expect(deleted.status).toBe(204);
    leadIds.delete(created.id);
    expect(
      await prisma.lead.findUnique({ where: { id: created.id } }),
    ).toBeNull();
  });

  it("does not expose leads to non-admin users", async () => {
    await register(uniqueEmail("bootstrap-admin"));
    const user = await register(uniqueEmail("not-admin"));
    const created = await createLead("private");

    const response = await get("/api/leads", user.accessToken);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      statusCode: 403,
      error: "FORBIDDEN",
      requestId: expect.any(String),
    });
    expect(
      await prisma.lead.findUnique({ where: { id: created.id } }),
    ).toBeTruthy();
  });

  it("lets admins fetch one lead and bulk update/delete", async () => {
    const admin = await register("admin@example.com");
    const a = await createLead("bulk-a");
    const b = await createLead("bulk-b");
    const c = await createLead("bulk-c");

    const one = await get(`/api/leads/${a.id}`, admin.accessToken);
    expect(one.status).toBe(200);
    expect((await one.json()) as Lead).toMatchObject({ id: a.id });

    const missing = await get("/api/leads/99999999", admin.accessToken);
    expect(missing.status).toBe(404);

    const bulkStatus = await postAuth(
      "/api/leads/bulk-status",
      { ids: [a.id, b.id], status: "CONTACTED" },
      admin.accessToken,
    );
    expect(bulkStatus.status).toBe(200);
    expect(await bulkStatus.json()).toEqual({ count: 2 });
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("CONTACTED");
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: c.id } })).status,
    ).toBe("NEW");

    const bulkDelete = await postAuth(
      "/api/leads/bulk-delete",
      { ids: [a.id, b.id, c.id] },
      admin.accessToken,
    );
    expect(bulkDelete.status).toBe(200);
    expect(await bulkDelete.json()).toEqual({ count: 3 });
    const ids = [a.id, b.id, c.id];
    ids.forEach((id) => leadIds.delete(id));
    const remaining = await prisma.lead.findMany({
      where: { id: { in: ids } },
    });
    expect(remaining).toHaveLength(0);
  });

  it("rejects bulk operations from non-admins and empty id lists", async () => {
    await register(uniqueEmail("bootstrap-admin"));
    const admin = await register("admin@example.com");
    const user = await register(uniqueEmail("not-admin"));
    const lead = await createLead("guarded");

    const forbidden = await postAuth(
      "/api/leads/bulk-delete",
      { ids: [lead.id] },
      user.accessToken,
    );
    expect(forbidden.status).toBe(403);
    expect(
      await prisma.lead.findUnique({ where: { id: lead.id } }),
    ).toBeTruthy();

    const empty = await postAuth(
      "/api/leads/bulk-status",
      { ids: [], status: "ARCHIVED" },
      admin.accessToken,
    );
    expect(empty.status).toBe(400);
  });

  async function register(email: string): Promise<AuthBody> {
    emails.add(email);
    const response = await post("/api/auth/register", {
      email,
      password: "password",
      name: "Test User",
    });
    expect(response.status).toBe(201);
    return (await response.json()) as AuthBody;
  }

  async function createLead(prefix: string): Promise<Lead> {
    const email = `${prefix}-${randomUUID()}@example.com`;
    const response = await submitLead({
      name: "Lead Owner",
      email,
      message: "This lead was created by an e2e test.",
    });
    expect(response.status).toBe(201);
    const lead = await prisma.lead.findFirstOrThrow({ where: { email } });
    leadIds.add(lead.id);
    return lead;
  }

  function uniqueEmail(prefix: string): string {
    return `${prefix}-${randomUUID()}@example.com`;
  }

  async function submitLead(body: Record<string, unknown>) {
    return post("/api/leads", body);
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

  async function deleteLeads(ids: number[]) {
    if (ids.length === 0) return;
    await prisma.lead.deleteMany({ where: { id: { in: ids } } });
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

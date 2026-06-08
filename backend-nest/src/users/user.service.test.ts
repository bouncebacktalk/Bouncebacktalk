import { describe, expect, it, vi } from "vitest";
import { UserService } from "./user.service";

describe("UserService", () => {
  it("marks the first registered user as admin", async () => {
    const { service, tx } = makeService(0);

    await service.create({
      email: "founder@example.com",
      password: "password",
      name: "Founder",
    });

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "founder@example.com",
        name: "Founder",
        isAdmin: true,
      }),
    });
  });

  it("does not mark later users as admin automatically", async () => {
    const { service, tx } = makeService(1);

    await service.create({
      email: "member@example.com",
      password: "password",
      name: "Member",
    });

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "member@example.com",
        isAdmin: false,
      }),
    });
  });

  it("treats database admins and ADMIN_EMAILS as admins", () => {
    const { service } = makeService(1, ["ops@example.com"]);

    expect(
      service.isAdmin({ email: "founder@example.com", isAdmin: true }),
    ).toBe(true);
    expect(service.isAdmin({ email: "ops@example.com", isAdmin: false })).toBe(
      true,
    );
    expect(
      service.isAdmin({ email: "member@example.com", isAdmin: false }),
    ).toBe(false);
  });
});

function makeService(existingUserCount: number, adminEmails: string[] = []) {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const tx = {
    user: {
      count: vi.fn().mockResolvedValue(existingUserCount),
      create: vi.fn(async ({ data }) => ({
        id: 1,
        createdAt,
        updatedAt: createdAt,
        ...data,
      })),
    },
  };
  const prisma = {
    $transaction: vi.fn((callback) => callback(tx)),
  };
  const logger = { log: vi.fn() };
  const config = { adminEmails };
  const auth = { revokeAllRefreshTokens: vi.fn() };

  return {
    service: new UserService(
      prisma as never,
      logger as never,
      config as never,
      auth as never,
    ),
    tx,
  };
}

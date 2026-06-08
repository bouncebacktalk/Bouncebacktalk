import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ConfigService } from "../config";
import { Logger } from "../logger";
import { PrismaService } from "../prisma";

/** A user row with secrets stripped, safe to return to any client. */
export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
}

// Cross-module dual-import for AuthService - see docs/05-nestjs-conventions.md.
// AuthService injects UserService, and UserService occasionally needs to call
// back into AuthService (e.g. to revoke refresh tokens on password change).
// The forwardRef on both ends breaks the cycle.
import type { AuthService as AuthServiceType } from "../auth/auth.service";
import { AuthService } from "../auth/auth.service";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthServiceType,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async create(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.createWithBootstrapAdmin(input, passwordHash);
    this.logger.log(`user created: ${user.id} <${user.email}>`);
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    this.logger.log(`password updated for user ${userId}`);
    // Revoke all existing refresh tokens - forces every device to log in
    // again with the new password. AuthService owns refresh-token state.
    await this.authService.revokeAllRefreshTokens(userId);
  }

  /** Strip sensitive fields before returning a user to a controller. */
  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isAdmin: this.isAdmin(user),
    };
  }

  isAdmin(user: Pick<User, "email" | "isAdmin">): boolean {
    return (
      user.isAdmin || this.config.adminEmails.includes(user.email.toLowerCase())
    );
  }

  // ─── Member management (admin) ───────────────────────────────────────────────

  /** List every user as a public profile, newest first. Optional name/email search. */
  async listPublic(search?: string): Promise<PublicUser[]> {
    const term = search?.trim();
    const users = await this.prisma.user.findMany({
      where: term
        ? {
            OR: [
              { email: { contains: term, mode: "insensitive" } },
              { name: { contains: term, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => this.toPublic(user));
  }

  /** Update the signed-in user's own display name (null clears it). */
  async updateOwnName(
    userId: number,
    name: string | null,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return this.toPublic(user);
  }

  /**
   * Promote or demote a user's DB admin flag. Refuses to demote the last
   * remaining DB admin so an app can never lock itself out of its own console.
   * Note: admins granted via ADMIN_EMAILS are config-driven and not affected
   * by this flag - they stay admin regardless.
   */
  async setAdmin(targetId: number, isAdmin: boolean): Promise<PublicUser> {
    const target = await this.findById(targetId);
    if (!target) throw new NotFoundException(`User ${targetId} not found`);

    if (!isAdmin && target.isAdmin) {
      await this.assertNotLastAdmin(targetId, "demote");
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { isAdmin },
    });
    this.logger.log(
      `user ${targetId} admin flag set to ${isAdmin} <${updated.email}>`,
    );
    return this.toPublic(updated);
  }

  /**
   * Delete a user. Guards against the two ways this could brick an app:
   * deleting yourself, or deleting the last admin. Dependent rows are removed
   * explicitly (no DB cascade) per project convention.
   */
  async remove(actingUserId: number, targetId: number): Promise<void> {
    if (actingUserId === targetId) {
      throw new BadRequestException(
        "You cannot delete your own account from member management.",
      );
    }
    const target = await this.findById(targetId);
    if (!target) throw new NotFoundException(`User ${targetId} not found`);
    if (target.isAdmin) {
      await this.assertNotLastAdmin(targetId, "delete");
    }

    await this.prisma.$transaction([
      this.prisma.passwordReset.deleteMany({ where: { userId: targetId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: targetId } }),
      this.prisma.user.delete({ where: { id: targetId } }),
    ]);
    this.logger.log(`user ${targetId} deleted by ${actingUserId}`);
  }

  /** Throws when `targetId` is the only DB-flagged admin left. */
  private async assertNotLastAdmin(
    targetId: number,
    action: "demote" | "delete",
  ): Promise<void> {
    const otherAdmins = await this.prisma.user.count({
      where: { isAdmin: true, id: { not: targetId } },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException(
        `Cannot ${action} the last admin. Promote another member to admin first.`,
      );
    }
  }

  private async createWithBootstrapAdmin(
    input: { email: string; name?: string },
    passwordHash: string,
    attempt = 0,
  ): Promise<User> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const userCount = await tx.user.count();
          return tx.user.create({
            data: {
              email: input.email.toLowerCase(),
              passwordHash,
              name: input.name,
              isAdmin: userCount === 0,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (attempt < 2 && isTransactionConflict(err)) {
        return this.createWithBootstrapAdmin(input, passwordHash, attempt + 1);
      }
      throw err;
    }
  }
}

function isTransactionConflict(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    err.code === "P2034"
  );
}

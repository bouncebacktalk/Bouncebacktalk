import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { ConfigService } from "../config";
import { Logger } from "../logger";
import { PrismaService } from "../prisma";
import { EmailQueue } from "../queue";

// Cross-module dual-import for UserService - see docs/05-nestjs-conventions.md.
import type { UserService as UserServiceType } from "../users/user.service";
import { UserService } from "../users/user.service";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_BYTES = 48; // 384 bits - comfortably more than the JWT secret entropy

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueue,
    private readonly logger: Logger,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserServiceType,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────────

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{
    user: User;
    tokens: AuthTokens;
  }> {
    const existing = await this.userService.findByEmail(input.email);
    if (existing) {
      // Don't reveal whether an email is registered via 409. Return a generic
      // error and treat it as if registration succeeded silently? No - for
      // most apps the registration form should be honest about duplicate
      // emails since it's how users notice "oh, I already have an account."
      // If your threat model differs, change this to 200 + a no-op email.
      throw new ConflictException("An account with this email already exists");
    }
    const user = await this.userService.create(input);
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(input: { email: string; password: string }): Promise<{
    user: User;
    tokens: AuthTokens;
  }> {
    const user = await this.userService.findByEmail(input.email);
    if (!user) {
      // Constant-ish-time response: 401 regardless of whether the user
      // exists, to slow down email enumeration. We still skip bcrypt when
      // there's no user - bcrypt is the slow part anyway, so a real attacker
      // can time the difference; we just don't make it trivial.
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await this.userService.verifyPassword(user, input.password);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  /**
   * Exchanges a valid refresh token for a fresh access + refresh pair.
   * Rotates the refresh token: the old one is revoked, a new one is issued.
   * If the same refresh token is presented twice (replay), the second use
   * fails because the row is already revoked - and we revoke the entire
   * chain as a defensive measure (signals possible compromise).
   */
  async refresh(
    rawRefreshToken: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      // Suspected replay: if we have a row but it's revoked, nuke all the
      // user's refresh tokens to invalidate any in-flight sessions.
      if (row?.revokedAt && row.user) {
        this.logger.warn(
          `refresh replay detected for user ${row.userId}; revoking all sessions`,
        );
        await this.revokeAllRefreshTokens(row.userId);
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(row.user);
    return { user: row.user, tokens };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => {
        // Token already gone or never existed - logout is idempotent.
      });
  }

  /** Called by UserService when a user changes their password. */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Password reset ────────────────────────────────────────────────────────

  /**
   * Always returns success, even if the email isn't registered. Prevents
   * account enumeration via the forgot-password endpoint. Real users get
   * a real email; missing accounts get nothing.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.logger.log(`forgot-password requested for unknown email: ${email}`);
      return;
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
    const resetUrl = `${this.config.env.PUBLIC_URL}/reset-password?token=${rawToken}`;
    await this.emailQueue.enqueuePasswordReset({
      to: user.email,
      appName: "bouncebacktalk_app",
      resetUrl,
      expiresIn: "1 hour",
    });
    this.logger.log(`password reset email queued for ${user.email}`);
  }

  /**
   * Change the password of an already-authenticated user. Verifies the current
   * password first, then delegates to `updatePassword`, which rotates the hash
   * and revokes every existing refresh token (logging out other devices). We
   * then issue a fresh token pair so the *current* device stays signed in -
   * the caller sets these as cookies, exactly like login.
   */
  async changePassword(
    user: User,
    input: { currentPassword: string; newPassword: string },
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const ok = await this.userService.verifyPassword(
      user,
      input.currentPassword,
    );
    if (!ok) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    await this.userService.updatePassword(user.id, input.newPassword);
    const tokens = await this.issueTokens(user);
    this.logger.log(`password changed for user ${user.id}`);
    return { user, tokens };
  }

  async resetPassword(input: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    const tokenHash = this.hashToken(input.token);
    const row = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }
    await this.prisma.passwordReset.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await this.userService.updatePassword(row.userId, input.newPassword);
    // updatePassword() already revokes refresh tokens via this service.
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.env.JWT_ACCESS_SECRET,
        expiresIn: this.config.env.JWT_ACCESS_TTL,
      },
    );
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
    const tokenHash = this.hashToken(refreshToken);
    const ttlSec = parseTtlSeconds(this.config.env.JWT_REFRESH_TTL);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlSec * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  /** SHA-256 - fast, deterministic, no salt needed since the input has 384
   *  bits of entropy and is single-use. We never store the raw token. */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

/**
 * Parse `15m` / `30d` / `7200s` style TTLs into seconds. Same shape NestJS
 * accepts in `JwtModule` config - we duplicate the logic here so the refresh
 * token expiry matches what jsonwebtoken would compute for the access token.
 */
function parseTtlSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) throw new Error(`Invalid TTL: ${ttl}`);
  const n = Number(match[1]);
  const unit = match[2]!;
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit]!;
  return n * mult;
}

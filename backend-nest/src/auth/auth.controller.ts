import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import type { Request, Response } from "express";
import { ConfigService } from "../config";
import { UserService } from "../users/user.service";
import { AuthService, type AuthTokens } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

/**
 * Auth REST endpoints. Browser auth is cookie-first: access + refresh
 * tokens are set as HTTP-only cookies. Responses can also expose the
 * short-lived access token so embedded preview clients can fall back to
 * an Authorization header when third-party cookies are blocked.
 *
 *   POST /api/auth/register          email + password + optional name
 *   POST /api/auth/login             email + password
 *   POST /api/auth/logout            clears cookies; revokes refresh token
 *   POST /api/auth/refresh           rotates tokens using refresh cookie
 *   POST /api/auth/forgot-password   sends reset email (always 204)
 *   POST /api/auth/reset-password    consumes reset token, sets new password
 *   POST /api/auth/change-password   signed-in password change; keeps this
 *                                    device, revokes other sessions
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(body);
    this.setAuthCookies(res, tokens);
    return this.authResponse(user, tokens);
  }

  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(body);
    this.setAuthCookies(res, tokens);
    return this.authResponse(user, tokens);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(refresh);
    res.clearCookie(ACCESS_COOKIE, this.cookieOptions());
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(true));
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refresh) throw new UnauthorizedException("Missing refresh token");
    const { user, tokens } = await this.authService.refresh(refresh);
    this.setAuthCookies(res, tokens);
    return this.authResponse(user, tokens);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    // Fire-and-forget: always 204 to prevent enumeration.
    await this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user: updated, tokens } = await this.authService.changePassword(
      user,
      body,
    );
    // Re-issue cookies so this device stays signed in; other sessions were
    // revoked inside changePassword().
    this.setAuthCookies(res, tokens);
    return this.authResponse(updated, tokens);
  }

  // ─── Cookie helpers ────────────────────────────────────────────────────────

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.cookieOptions(),
      maxAge: ttlMs(this.config.env.JWT_ACCESS_TTL),
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(true),
      maxAge: ttlMs(this.config.env.JWT_REFRESH_TTL),
    });
  }

  private authResponse(user: User, tokens: AuthTokens) {
    return {
      user: this.userService.toPublic(user),
      ...(this.config.env.AUTH_EXPOSE_ACCESS_TOKEN
        ? { accessToken: tokens.accessToken }
        : {}),
    };
  }

  /**
   * `restrictToRefreshPath` scopes the refresh cookie to /api/auth/refresh
   * only - every other request never sees it, narrowing the attack surface.
   */
  private cookieOptions(restrictToRefreshPath = false) {
    const sameSite = this.config.env.AUTH_COOKIE_SAME_SITE;
    const secure =
      sameSite === "none"
        ? true
        : (this.config.env.AUTH_COOKIE_SECURE ?? this.config.isProd);
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: restrictToRefreshPath ? "/api/auth/refresh" : "/",
    };
  }
}

function ttlMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 60_000;
  const n = Number(match[1]);
  const unit = match[2]!;
  const mult = { s: 1000, m: 60_000, h: 3600_000, d: 86_400_000 }[unit]!;
  return n * mult;
}

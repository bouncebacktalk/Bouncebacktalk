import {
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { User } from "@prisma/client";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "../../config";

// Cross-module dual-import for UserService - see docs/05-nestjs-conventions.md.
import type { UserService as UserServiceType } from "../../users/user.service";
import { UserService } from "../../users/user.service";

export interface JwtPayload {
  sub: number;
  email: string;
  /** Issued-at, set by jsonwebtoken automatically. */
  iat?: number;
  /** Expiration, set by jsonwebtoken automatically. */
  exp?: number;
}

/**
 * JwtStrategy validates an access token on every protected request.
 *
 * Token extraction order:
 *   1. `access_token` HTTP-only cookie (default for browser clients)
 *   2. `Authorization: Bearer <jwt>` header (for API clients / mobile apps)
 *
 * On success, `validate()` returns the User which Passport attaches to
 * `request.user`. The `@CurrentUser()` decorator reads it from there.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserServiceType,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }
    return user;
  }
}

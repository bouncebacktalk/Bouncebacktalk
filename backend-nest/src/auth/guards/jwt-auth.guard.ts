import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * `@UseGuards(JwtAuthGuard)` on any controller method to require a valid
 * access token. The token is read from the `access_token` HTTP-only cookie
 * (see strategies/jwt.strategy.ts), or from the `Authorization: Bearer <jwt>`
 * header for API clients that prefer it.
 *
 * On success, JwtStrategy.validate() runs and attaches the User to the
 * request - read it via `@CurrentUser()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

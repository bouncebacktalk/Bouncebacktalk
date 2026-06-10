import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { User } from "@prisma/client";

/**
 * `@CurrentUser()` extracts the authenticated user that JwtStrategy attached
 * to the request. Use it in any controller method protected by JwtAuthGuard.
 * This is the full Prisma User row, not the raw JWT payload. Use `user.id`
 * for the database id; `sub` exists only inside the token payload.
 *
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   me(@CurrentUser() user: User) { return user }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    return data ? user?.[data] : user;
  },
);

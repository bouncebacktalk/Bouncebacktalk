import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ListUsersQueryDto,
  SetAdminDto,
  UpdateProfileDto,
  UserIdParamDto,
} from "./dto/users.dto";
import { UserService } from "./user.service";

/**
 * Users controller.
 *
 *   GET    /api/users        - admin: list all members (optional ?search)
 *   GET    /api/users/me     - return the authenticated user's public profile
 *   PATCH  /api/users/me     - update your own display name
 *   PATCH  /api/users/:id    - admin: promote/demote a member's admin flag
 *   DELETE /api/users/:id    - admin: remove a member
 *
 * `me` routes are declared before `:id` routes so the literal path wins.
 */
@Controller("users")
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  list(@Query() query: ListUsersQueryDto) {
    return this.userService.listPublic(query.search);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.userService.toPublic(user);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return this.userService.updateOwnName(user.id, body.name);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  setAdmin(@Param() params: UserIdParamDto, @Body() body: SetAdminDto) {
    return this.userService.setAdmin(params.id, body.isAdmin);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@CurrentUser() user: User, @Param() params: UserIdParamDto) {
    return this.userService.remove(user.id, params.id);
  }
}

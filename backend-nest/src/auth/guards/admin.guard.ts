import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import type { Request } from "express";
import { ConfigService } from "../../config";

interface RequestWithUser extends Request {
  user?: User;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const email = request.user?.email.toLowerCase();
    if (request.user?.isAdmin) return true;
    if (email && this.config.adminEmails.includes(email)) return true;

    throw new ForbiddenException(
      "Admin access required. Use the first registered admin account, or add your email to ADMIN_EMAILS.",
    );
  }
}

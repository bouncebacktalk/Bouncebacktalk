import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserService } from "./user.service";
import { UsersController } from "./users.controller";

/**
 * Users feature module. Depends on AuthModule (for token revocation on
 * password change) and is depended on by AuthModule (for user lookup
 * during login). The forwardRef on both ends is what makes that cycle
 * resolvable at boot - see docs/05-nestjs-conventions.md Rule 2.
 */
@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [UserService],
  controllers: [UsersController],
  exports: [UserService],
})
export class UsersModule {}

import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "../config";
import { QueueModule } from "../queue";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./guards/admin.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";

/**
 * Auth module.
 *
 * Imports `UsersModule` lazily via `forwardRef` because UsersModule also
 * imports AuthModule (UserService → AuthService for token revocation).
 * See docs/05-nestjs-conventions.md.
 *
 * `JwtModule.registerAsync` reads the access secret from ConfigService -
 * crashes at boot if `JWT_ACCESS_SECRET` is empty, which is what we want.
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    QueueModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: config.env.JWT_ACCESS_TTL },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, AdminGuard],
  controllers: [AuthController],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}

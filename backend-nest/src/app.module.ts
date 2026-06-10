import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { RequestIdMiddleware } from "./common/request-id.middleware";
import { ConfigModule } from "./config";
import { EmailModule } from "./email";
import { HealthController } from "./health.controller";
import { BetsModule } from "./bets/bets.module";
import { LeadsModule } from "./leads";
import { LoggerModule } from "./logger";
import { PrismaModule } from "./prisma";
import { QueueModule } from "./queue";
import { UsersModule } from "./users";

// EmailModule is always loaded because the default `console` transport
// requires no setup and the rest of the app (auth password-reset, future
// notifications) can call `EmailService.send()` without conditional imports.
// Set `MAIL_TRANSPORT=resend` + `RESEND_API_KEY` in env to send for real.

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    EmailModule,
    PrismaModule,
    QueueModule,
    UsersModule,
    AuthModule,
    LeadsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}

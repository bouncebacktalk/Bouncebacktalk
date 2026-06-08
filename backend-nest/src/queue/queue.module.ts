import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "../config";
import { EMAIL_QUEUE } from "./queue.constants";
import { EmailProcessor } from "./email.processor";
import { EmailQueue } from "./email.queue";

/**
 * QueueModule - wraps BullMQ with our shared Redis connection.
 *
 * Pattern: one BullModule.forRootAsync at app boot pinned to Redis db 2,
 * then `BullModule.registerQueue('name')` for each queue. Workers are Nest
 * providers decorated with `@Processor('name')`. The starter ships an `email`
 * queue because password reset and transactional emails are the first
 * background job most business apps need.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (!config.env.REDIS_URL) {
          throw new Error(
            "QueueModule requires REDIS_URL. setup.sh should generate it in .env.local.",
          );
        }
        const url = new URL(config.queueRedisUrl);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: decodeURIComponent(url.password) || undefined,
            db: Number(url.pathname.replace("/", "") || 0),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailQueue, EmailProcessor],
  exports: [EmailQueue],
})
export class QueueModule {}

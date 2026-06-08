import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { ConfigService } from "./config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  configureApp(app);
  await app.listen(config.env.PORT, "0.0.0.0");
  console.log(
    `backend listening on :${config.env.PORT} (${config.env.NODE_ENV})`,
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

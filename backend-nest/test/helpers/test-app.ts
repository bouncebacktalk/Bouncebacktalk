import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";

export async function createE2EApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.listen(0);
  return app;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Graceful shutdown: on SIGTERM/SIGINT the BullMQ worker finishes in-flight
  // transitions before the process exits, instead of stalling them.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

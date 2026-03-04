import { NestFactory } from '@nestjs/core';
import { LoopstackApiModule } from '@loopstack/api';
import { AppModule } from './app.module';

process.env.TZ = 'UTC';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  LoopstackApiModule.setup(app);

  const port = process.env.PORT ?? 8000;
  const host = process.env.HOST ?? 'localhost';
  await app.listen(port, host);
  process.send?.('ready');
}
void bootstrap();

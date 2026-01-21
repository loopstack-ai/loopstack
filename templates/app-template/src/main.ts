process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoopstackApiModule } from '@loopstack/api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  LoopstackApiModule.setup(app as any);

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();

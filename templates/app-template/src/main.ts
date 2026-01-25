import { NestFactory } from '@nestjs/core';
import { LoopstackApiModule } from '@loopstack/api';
import { AppModule } from './app.module';

process.env.TZ = 'UTC';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  LoopstackApiModule.setup(app);

  await app.listen(process.env.PORT ?? 8000);
}
void bootstrap();

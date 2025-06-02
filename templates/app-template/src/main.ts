import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoopstackApiModule } from '@loopstack/api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug'],
    abortOnError: false,
  });

  LoopstackApiModule.setup(app as any);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    await CommandFactory.run(AppModule);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
  process.exit(0);
}

void bootstrap();

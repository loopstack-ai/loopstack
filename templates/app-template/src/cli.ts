import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

async function bootstrap() {
  try {
    await CommandFactory.run(CliModule, ['warn', 'error']);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
  process.exit(0);
}

void bootstrap();

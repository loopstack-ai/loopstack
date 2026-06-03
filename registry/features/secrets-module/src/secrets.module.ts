import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { registerFeature } from '@loopstack/common';
import { SecretController } from './controllers/index.js';
import { SecretRequestDocument } from './documents/index.js';
import { SecretEntity } from './entities/index.js';
import { SecretService } from './services/index.js';
import { GetSecretKeysTool, RequestSecretsTask, RequestSecretsTool, SecretsRequestWorkflow } from './tools/index.js';

@Module({
  imports: [TypeOrmModule.forFeature([SecretEntity])],
  controllers: [SecretController],
  providers: [
    SecretService,
    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,
    SecretsRequestWorkflow,
    SecretRequestDocument,
  ],
  exports: [
    SecretService,
    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,
    SecretsRequestWorkflow,
    SecretRequestDocument,
  ],
})
export class SecretsModule {
  static forFeature(config?: { enabled?: boolean }): DynamicModule {
    return {
      module: SecretsModule,
      providers: [registerFeature('secrets', config)],
    };
  }
}

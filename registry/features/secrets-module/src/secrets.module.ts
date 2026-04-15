import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopCoreModule } from '@loopstack/core';
import { SecretController } from './controllers';
import { SecretRequestDocument } from './documents';
import { SecretEntity } from './entities';
import { SecretService } from './services';
import { GetSecretKeysTool, RequestSecretsTask, RequestSecretsTool, SecretsRequestWorkflow } from './tools';

@Module({
  imports: [LoopCoreModule, TypeOrmModule.forFeature([SecretEntity])],
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
export class SecretsModule {}

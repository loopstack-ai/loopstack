import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { registerFeature } from '@loopstack/common';
import { SecretController } from './controllers/index.js';
import { SecretRequestDocument } from './documents/index.js';
import { SecretEntity } from './entities/index.js';
import { SecretService } from './services/index.js';
import { GetSecretKeysTool, RequestSecretsTask, RequestSecretsTool, SecretsRequestWorkflow } from './tools/index.js';

/**
 * NestJS module that provides workspace-scoped secrets storage — the `SecretEntity`, `SecretService`,
 * `SecretController` REST API, the `get_secret_keys` / `request_secrets` / `request_secrets_task` tools,
 * `SecretsRequestWorkflow`, and `SecretRequestDocument`.
 *
 * Registration:
 * - `SecretsModule` — bare import registers the entity, controller, services, tools, and workflow; use
 *   this when you do not need feature-registry toggling.
 * - `SecretsModule.forFeature({ enabled?: boolean })` — use when you want the secrets capability registered
 *   with the feature registry so it can be opt-in toggled via the `enabled` flag.
 *
 * Requires: a configured database — your root `TypeOrmModule.forRoot()` must include `SecretEntity` (the
 * module registers it via `TypeOrmModule.forFeature` internally, but the connection and schema must exist).
 *
 * @public
 */
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

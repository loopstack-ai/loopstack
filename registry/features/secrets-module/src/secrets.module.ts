import { type DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { registerFeature } from '@loopstack/common';
import { SecretController } from './controllers/index.js';
import { SecretRequestDocument } from './documents/index.js';
import { SecretEntity } from './entities/index.js';
import { SECRETS_MODULE_CONFIG, type SecretsModuleConfig } from './secrets.constants.js';
import { SecretService } from './services/index.js';
import { GetSecretKeysTool, RequestSecretsTask, RequestSecretsTool, SecretsRequestWorkflow } from './tools/index.js';

const DEFAULT_CONFIG: SecretsModuleConfig = {};

/**
 * Config-consuming providers, re-provided per registration so each importing module gets its own
 * {@link SecretsModuleConfig} (e.g. a module-scoped global-secret allowlist) — mirrors how a feature module
 * re-provides its config-bound tools. Everything else lives once in the global root below.
 */
const SCOPED = [SecretService, GetSecretKeysTool];

/** Shared providers with no per-module config — provided once in the global root. */
const SHARED = [RequestSecretsTool, RequestSecretsTask, SecretsRequestWorkflow, SecretRequestDocument];

/**
 * Internal global root — provides the entity/repo, the REST controller, and the shared services/tools once,
 * app-wide (incl. a default {@link SECRETS_MODULE_CONFIG}). A separate class from {@link SecretsModule} so
 * NestJS doesn't deduplicate it with `forFeature()` imports (which re-provide the SCOPED consumers locally).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SecretEntity])],
  controllers: [SecretController],
  providers: [{ provide: SECRETS_MODULE_CONFIG, useValue: DEFAULT_CONFIG }, ...SCOPED, ...SHARED],
  // Export TypeOrmModule so a SCOPED SecretService re-provided in another module can still inject the repo.
  exports: [SECRETS_MODULE_CONFIG, ...SCOPED, ...SHARED, TypeOrmModule],
})
class SecretsRootModule {}

/**
 * NestJS module that provides workspace-scoped secrets storage — the `SecretEntity`, `SecretService`,
 * `SecretController` REST API, the `get_secret_keys` / `request_secrets` / `request_secrets_task` tools,
 * `SecretsRequestWorkflow`, and `SecretRequestDocument`.
 *
 * Registration:
 * - `SecretsModule` — bare import registers the global root with the default (empty) config; use when you
 *   don't need the feature toggle or a global-secret allowlist.
 * - `SecretsModule.forRoot(config)` — sets the app-wide default {@link SecretsModuleConfig} (e.g. the
 *   global-secret allowlist read by `SecretService`). Import once at the root.
 * - `SecretsModule.forFeature(config)` — registers the `secrets` Studio feature and overrides the config
 *   for this module's `SecretService` / `get_secret_keys` — so different modules can declare different
 *   global-secret allowlists.
 *
 * Requires: a configured database — your root `TypeOrmModule.forRoot()` must include `SecretEntity` (the
 * module registers it via `TypeOrmModule.forFeature` internally, but the connection and schema must exist).
 *
 * @public
 */
@Module({ imports: [SecretsRootModule] })
export class SecretsModule {
  static forRoot(config: SecretsModuleConfig = {}): DynamicModule {
    return {
      module: SecretsRootModule,
      global: true,
      providers: [
        registerFeature('secrets', { enabled: config.enabled }),
        { provide: SECRETS_MODULE_CONFIG, useValue: config },
        ...SCOPED,
      ],
      exports: [SECRETS_MODULE_CONFIG, ...SCOPED],
    };
  }

  static forFeature(config: SecretsModuleConfig = {}): DynamicModule {
    return {
      module: SecretsModule,
      imports: [SecretsRootModule],
      providers: [
        registerFeature('secrets', { enabled: config.enabled }),
        { provide: SECRETS_MODULE_CONFIG, useValue: config },
        ...SCOPED,
      ],
      exports: [SECRETS_MODULE_CONFIG, ...SCOPED],
    };
  }
}

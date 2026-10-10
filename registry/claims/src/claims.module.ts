import { type DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CLAIMS_MODULE_CONFIG, type ClaimsModuleConfig } from './claims.constants.js';
import { ResourceClaimController } from './controllers/index.js';
import { ResourceClaimEntity } from './entities/index.js';
import { ClaimLifecycleListener, ResourceClaimService } from './services/index.js';
import { CheckResourcesTool, ClaimResourceTool, ReleaseResourceTool } from './tools/index.js';

const DEFAULT_CONFIG: ClaimsModuleConfig = {};

const PROVIDERS = [
  ResourceClaimService,
  ClaimLifecycleListener,
  ClaimResourceTool,
  ReleaseResourceTool,
  CheckResourcesTool,
];

/**
 * Internal global root — the entity and repository, the REST listing, the service, the lifecycle listener
 * and the tools, once and app-wide. A separate class from {@link ClaimsModule} so NestJS does not
 * deduplicate it with a `forRoot()` that re-provides the config.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ResourceClaimEntity])],
  controllers: [ResourceClaimController],
  providers: [{ provide: CLAIMS_MODULE_CONFIG, useValue: DEFAULT_CONFIG }, ...PROVIDERS],
  exports: [CLAIMS_MODULE_CONFIG, ...PROVIDERS, TypeOrmModule],
})
class ClaimsRootModule {}

/**
 * NestJS module that provides resource claims — the `ResourceClaimEntity`, `ResourceClaimService`, the
 * `claim_resource` / `release_resource` / `check_resources` tools, a read-only REST listing, and the
 * listeners that release a claim when its scope ends.
 *
 * A resource is a key, created on demand. A claim says who holds it and for how long: `workflow` scope lives
 * as long as one run, `workspace` scope as long as the workspace. Capacity and mode decide whether a claim
 * can be taken — one exclusive holder, or shared holders up to the configured capacity — so the same
 * primitive serves a mutex, a pool of N, and a reader/writer lock.
 *
 * Claiming takes every resource in a request or none of them, is idempotent per resource and scope target,
 * and never waits.
 *
 * Registration:
 * - `ClaimsModule` — bare import, every resource with the default capacity of one.
 * - `ClaimsModule.forRoot(config)` — declares the resources whose capacity is not one. Import once at the
 *   root.
 *
 * Requires: PostgreSQL (the claim transaction takes a `pg_advisory_xact_lock` per resource) and a root
 * `TypeOrmModule.forRoot()` whose schema includes `ResourceClaimEntity`; `EventEmitterModule`, which
 * `LoopstackModule` already registers, for the release listeners.
 *
 * @public
 */
@Module({ imports: [ClaimsRootModule] })
export class ClaimsModule {
  static forRoot(config: ClaimsModuleConfig = {}): DynamicModule {
    return {
      module: ClaimsRootModule,
      global: true,
      providers: [{ provide: CLAIMS_MODULE_CONFIG, useValue: config }, ...PROVIDERS],
      exports: [CLAIMS_MODULE_CONFIG, ...PROVIDERS],
    };
  }
}

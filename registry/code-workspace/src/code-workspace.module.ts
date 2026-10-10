import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import {
  CODE_WORKSPACE_OPTIONS,
  type CodeWorkspaceOptions,
  resolveCodeWorkspaceOptions,
} from './code-workspace.options.js';
import { CODE_WORKSPACE_PROVISIONER } from './code-workspace.provisioner.js';
import { LocalDockerProvisioner } from './local-docker.provisioner.js';
import { RepoGitClient } from './repo-git-client.js';
import { WorkspaceCleanupListener } from './workspace-cleanup.listener.js';
import { WorkspaceInventoryService } from './workspace-inventory.service.js';

export type { CodeWorkspaceOptions, ResolvedCodeWorkspaceOptions } from './code-workspace.options.js';
export { CODE_WORKSPACE_OPTIONS } from './code-workspace.options.js';

/** Async config for {@link CodeWorkspaceModule.forRootAsync} — a factory (with DI) returning the options. */
export interface CodeWorkspaceModuleAsyncOptions {
  imports?: DynamicModule['imports'];
  inject?: any[];
  useFactory: (...args: any[]) => CodeWorkspaceOptions | Promise<CodeWorkspaceOptions>;
}

/**
 * Provides the domain-neutral {@link CodeWorkspaceProvisioner} (base + per-workflow checkouts + container
 * lifecycle) to the whole app, bound to the {@link CODE_WORKSPACE_PROVISIONER} token so a different
 * implementation (e.g. a remote provisioner) can swap in without touching consumers. Global so every
 * consumer can inject it without importing this module. Configure once at the app root
 * (`forRoot`/`forRootAsync`).
 *
 * It owns the whole life of that state, not only its creation: {@link WorkspaceInventoryService} says what
 * exists and what is orphaned, and {@link WorkspaceCleanupListener} releases a workspace's or a run's state
 * when its row is deleted. What to ask the user before reclaiming anything is left to the application —
 * which is why nothing here opens a gate.
 *
 * @public
 */
@Global()
@Module({})
export class CodeWorkspaceModule {
  static forRoot(options?: CodeWorkspaceOptions): DynamicModule {
    return this.build({ provide: CODE_WORKSPACE_OPTIONS, useValue: resolveCodeWorkspaceOptions(options) });
  }

  static forRootAsync(options: CodeWorkspaceModuleAsyncOptions): DynamicModule {
    return this.build(
      {
        provide: CODE_WORKSPACE_OPTIONS,
        useFactory: async (...args: unknown[]) => resolveCodeWorkspaceOptions(await options.useFactory(...args)),
        inject: options.inject ?? [],
      },
      options.imports ?? [],
    );
  }

  private static build(optionsProvider: Provider, imports: DynamicModule['imports'] = []): DynamicModule {
    return {
      module: CodeWorkspaceModule,
      // The inventory joins disk and Docker against these two tables; nothing else here touches the database.
      imports: [...imports, TypeOrmModule.forFeature([WorkflowEntity, WorkspaceEntity])],
      providers: [
        optionsProvider,
        { provide: CODE_WORKSPACE_PROVISIONER, useClass: LocalDockerProvisioner },
        RepoGitClient,
        WorkspaceInventoryService,
        WorkspaceCleanupListener,
      ],
      // The options token is exported too: the maintenance app reads `knownBaseKeys` from it, and anything
      // else consuming this module may want the namespace or the state dir it was configured with.
      exports: [CODE_WORKSPACE_OPTIONS, CODE_WORKSPACE_PROVISIONER, RepoGitClient, WorkspaceInventoryService],
    };
  }
}

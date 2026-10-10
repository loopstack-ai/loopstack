import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';
import { LocalFileExplorerController } from './controllers/index.js';
import { FileApiService, FileSystemService } from './services/index.js';

/**
 * NestJS module that provides workspace-scoped REST endpoints for browsing and
 * reading the local filesystem (`LocalFileExplorerController`), plus the
 * `FileApiService` and `FileSystemService` for programmatic file access.
 *
 * Registration:
 * - `LocalFileExplorerModule` — bare import. Enough for most apps: the controller
 *   and services are wired up automatically and the endpoints go live.
 * - `LocalFileExplorerModule.forFeature(config?: { enabled?: boolean; environments?: string[] })`
 *   — use to register it as a Studio feature flag (lights up the file-explorer
 *   panel) and optionally scope it to specific environment names.
 *
 * Requires: nothing beyond importing the module.
 *
 * @public
 */
@Module({
  controllers: [LocalFileExplorerController],
  providers: [FileSystemService, FileApiService],
  exports: [FileApiService, FileSystemService],
})
export class LocalFileExplorerModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule {
    return {
      module: LocalFileExplorerModule,
      providers: [registerFeature('localFileExplorer', config)],
    };
  }
}

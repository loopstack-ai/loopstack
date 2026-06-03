import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';
import { LocalFileExplorerController } from './controllers/index.js';
import { FileApiService, FileSystemService } from './services/index.js';

@Module({
  controllers: [LocalFileExplorerController],
  providers: [FileSystemService, FileApiService],
  exports: [FileApiService, FileSystemService],
})
export class LocalFileExplorerModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule {
    return {
      module: LocalFileExplorerModule,
      providers: [registerFeature('fileExplorer', config)],
    };
  }
}

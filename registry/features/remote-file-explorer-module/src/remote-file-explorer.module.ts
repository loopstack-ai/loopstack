import { type DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';
import { RemoteFileExplorerController } from './controllers/index.js';

@Module({
  controllers: [RemoteFileExplorerController],
})
export class RemoteFileExplorerModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule {
    return {
      module: RemoteFileExplorerModule,
      providers: [registerFeature('fileExplorer', config)],
    };
  }
}

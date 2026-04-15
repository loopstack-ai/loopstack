import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { LocalFileExplorerController } from './controllers';
import { FileApiService, FileSystemService } from './services';

@Module({
  imports: [LoopCoreModule],
  controllers: [LocalFileExplorerController],
  providers: [FileSystemService, FileApiService],
  exports: [FileApiService, FileSystemService],
})
export class LocalFileExplorerModule {}

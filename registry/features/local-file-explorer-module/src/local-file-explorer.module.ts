import { Module } from '@nestjs/common';
import { LocalFileExplorerController } from './controllers';
import { FileApiService, FileSystemService } from './services';

@Module({
  controllers: [LocalFileExplorerController],
  providers: [FileSystemService, FileApiService],
  exports: [FileApiService, FileSystemService],
})
export class LocalFileExplorerModule {}

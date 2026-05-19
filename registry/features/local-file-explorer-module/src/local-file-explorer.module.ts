import { Module } from '@nestjs/common';
import { LocalFileExplorerController } from './controllers/index.js';
import { FileApiService, FileSystemService } from './services/index.js';

@Module({
  controllers: [LocalFileExplorerController],
  providers: [FileSystemService, FileApiService],
  exports: [FileApiService, FileSystemService],
})
export class LocalFileExplorerModule {}

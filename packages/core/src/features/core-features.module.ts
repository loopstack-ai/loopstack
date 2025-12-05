import { Module } from '@nestjs/common';
import { CoreDocumentModule } from './core-document';
import { CoreToolsModule } from './core-tools';

@Module({
  imports: [CoreDocumentModule, CoreToolsModule],
  exports: [CoreDocumentModule, CoreToolsModule],
})
export class CoreFeaturesModule {}

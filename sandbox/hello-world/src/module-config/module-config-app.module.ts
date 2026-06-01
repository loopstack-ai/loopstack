import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ModuleConfigExampleModule } from '@loopstack/module-config-example';
import { ModuleConfigController } from './module-config.controller';

@StudioApp({ title: 'Module Config Example' })
@Module({
  imports: [ModuleConfigExampleModule],
  controllers: [ModuleConfigController],
})
export class ModuleConfigAppModule {}

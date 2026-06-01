import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloModule } from './hello/hello.module';
import { ModuleConfigAppModule } from './module-config/module-config-app.module';

@Module({
  imports: [LoopstackModule.forRoot(), HelloModule, ModuleConfigAppModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

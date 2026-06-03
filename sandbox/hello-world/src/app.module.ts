import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { HelloModule } from './hello/hello.module';
@Module({
  imports: [LoopstackModule.forRoot(), HelloModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

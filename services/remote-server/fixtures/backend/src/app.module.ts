import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot()],
})
export class AppModule {}

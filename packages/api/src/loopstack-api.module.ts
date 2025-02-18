import { DynamicModule, Module } from '@nestjs/common';
import { LoopstackApiController } from './loopstack-api.controller';
import { LoopstackApiService } from './loopstack-api.service';

@Module({
  imports: [],
  controllers: [LoopstackApiController],
  providers: [LoopstackApiService],
})
export class LoopstackApiModule {
  static forRoot(config: any): DynamicModule {
    return {
      module: LoopstackApiModule,
      imports: [],
    };
  }

  static forRootAsync(configFactory: () => Promise<any>): DynamicModule {
    return {
      module: LoopstackApiModule,
    };
  }
}

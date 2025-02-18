import { DynamicModule, Module } from '@nestjs/common';
import { LoopstackCoreController } from './loopstack-core.controller';
import { LoopstackCoreService } from './loopstack-core.service';
import { LoopstackCoreModuleOptionsInterface } from "./interfaces/loopstack-core-module-options.interface";

@Module({
  imports: [],
  controllers: [LoopstackCoreController],
  providers: [LoopstackCoreService],
})
export class LoopstackCoreModule {
  static forRoot(config: LoopstackCoreModuleOptionsInterface): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [],
    };
  }

  static forRootAsync(configFactory: () => Promise<LoopstackCoreModuleOptionsInterface>): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [
        // TypeOrmModule.forRootAsync({
        //   useFactory: dbConfigFactory,
        // }),
      ],
    };
  }
}

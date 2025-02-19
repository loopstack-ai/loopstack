import { DynamicModule, Module } from '@nestjs/common';
import { LoopstackCoreService } from './loopstack-core.service';
import { LoopstackCoreModuleOptionsInterface } from './config/interfaces/loopstack-core-module-options.interface';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [LoopstackCoreService],
})
export class LoopstackCoreModule {
  static forRoot(config: LoopstackCoreModuleOptionsInterface): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [],
    };
  }

  static forRootAsync(
    configFactory: () => Promise<LoopstackCoreModuleOptionsInterface>,
  ): DynamicModule {
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

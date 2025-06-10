import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopCoreModule } from '@loopstack/core';
import { LlmModule } from '@loopstack/llm';

@Module({})
export class TestModule {
  static forRoot(
    options: {
      configs?: any;
      mockServices?: any[];
    } = {},
  ): DynamicModule {
    const { configs = {}, mockServices = [] } = options;

    const providers = [...mockServices];

    return {
      module: TestModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          database: 'e2e_test',
          password: 'admin',
          autoLoadEntities: true,
          synchronize: true,
        }),
        LoopCoreModule.forRoot({
          configs,
        }),
        LlmModule,
      ],
      providers,
      exports: providers,
    };
  }
}

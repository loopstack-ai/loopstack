import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LoopCoreModule } from '../src';

@Module({})
export class TestModule {
  static forRoot(options: {
    configs?: any;
    mockServices?: any[];
  } = {}): DynamicModule {
    const {
      configs = {},
      mockServices = [],
    } = options;

    const providers = [...mockServices];

    return {
      module: TestModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'admin',
          database: 'e2e_test',
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        LoopCoreModule.forRoot({
          configs,
        }),
      ],
      providers,
      exports: providers,
    };
  }
}
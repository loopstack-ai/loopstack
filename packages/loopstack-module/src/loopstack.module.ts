import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { LoopCoreModule } from '@loopstack/core';
import { LoopstackModuleOptions } from './interfaces/index.js';
import { buildAppConfig, buildAuthConfig, buildDatabaseOptions } from './loopstack-config.js';

@Module({})
export class LoopstackModule {
  static forRoot(options: LoopstackModuleOptions = {}): DynamicModule {
    const imports: DynamicModule['imports'] = [];
    const reuseExistingConnection = options.database?.reuseExistingConnection ?? false;

    // Config
    imports.push(
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [buildAppConfig(options), buildAuthConfig(options)],
      }),
    );

    // TypeORM — register the default connection unless the host already provides one.
    if (!reuseExistingConnection) {
      imports.push(TypeOrmModule.forRoot(buildDatabaseOptions(options)));
    }

    // EventEmitter
    imports.push(EventEmitterModule.forRoot());

    // Core + API — all internal repositories use the default connection.
    imports.push(LoopCoreModule.forRoot({ redis: options.redis }));

    imports.push(
      LoopstackApiModule.register({
        cors: options.cors,
        corsOrigins: options.corsOrigins,
        sse: options.sse,
      }),
    );

    return {
      module: LoopstackModule,
      imports,
      exports: [LoopstackApiModule, LoopCoreModule],
    };
  }
}

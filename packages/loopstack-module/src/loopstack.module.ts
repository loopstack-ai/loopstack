import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { LoopCoreModule } from '@loopstack/core';
import { LoopstackModuleOptions } from './interfaces/index.js';
import { buildAppConfig, buildAuthConfig } from './loopstack-config.js';

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
      const db = options.database ?? {};
      // A single DATABASE_URL is honored (managed/hosted environments, PaaS) when no programmatic
      // database options are given; otherwise fall back to the discrete DATABASE_* vars + defaults.
      const databaseUrl = !options.database ? process.env.DATABASE_URL : undefined;
      imports.push(
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: db.host ?? process.env.DATABASE_HOST ?? 'localhost',
                port: db.port ?? (Number(process.env.DATABASE_PORT) || 5432),
                username: db.username ?? process.env.DATABASE_USERNAME ?? 'postgres',
                database: db.database ?? process.env.DATABASE_NAME ?? 'postgres',
                password: db.password ?? process.env.DATABASE_PASSWORD ?? 'admin',
              }),
          autoLoadEntities: true,
          synchronize: true,
          migrationsRun: false,
        }),
      );
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

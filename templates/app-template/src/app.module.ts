import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { loopstackConfig } from './loopstack.config';
import { ExampleModule } from './example-module/example.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: loopstackConfig,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        database: configService.get('DATABASE_NAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'admin'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    LoopCoreModule,
    LoopstackApiModule,
    ExampleModule,
  ],
})
export class AppModule {}

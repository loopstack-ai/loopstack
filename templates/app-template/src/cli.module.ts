import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoopCoreModule } from '@loopstack/core';
import { LlmModule } from '@loopstack/llm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { cliConfig } from './app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [cliConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => configService.get('database') as TypeOrmModuleOptions,
      inject: [ConfigService],
    }),
    LoopCoreModule,
    LlmModule,
  ],
  providers: [],
})
export class CliModule {}

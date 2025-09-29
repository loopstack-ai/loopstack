import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { LlmModule } from '@loopstack/llm';
import { AuthModule, JwtAuthGuard } from '@loopstack/auth';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig, authConfig, databaseConfig } from './app.config';
import { MyModuleModule } from './my-module/my-module.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        appConfig,
        authConfig,
        databaseConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => configService.get('database') as TypeOrmModuleOptions,
      inject: [ConfigService],
    }),
    LoopCoreModule,
    AuthModule.forRoot(),
    LoopstackApiModule,
    LlmModule,
    MyModuleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

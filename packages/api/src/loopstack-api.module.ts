import { INestApplication, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { ProjectController } from './controllers/project.controller';
import { ProjectApiService } from './services/project-api.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './controllers/workspace.controller';
import { WorkspaceApiService } from './services/workspace-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import {
  DocumentEntity,
  NamespaceEntity, ProjectEntity, WorkflowEntity, WorkspaceEntity,
} from '@loopstack/shared';
import { ProcessorController } from './controllers/processor.controller';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoopstackApiConfigPluginOptions } from './interfaces/api-config-options';
import { WorkflowController } from './controllers/workflow.controller';
import { DocumentController } from './controllers/document.controller';
import { WorkflowApiService } from './services/workflow-api.service';
import { DocumentApiService } from './services/document-api.service';
import {NamespaceController} from "./controllers/namespace.controller";
import {NamespaceApiService} from "./services/namespace-api.service";
import { ConfigurationModule, LoopCoreModule } from '@loopstack/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { NullStrategy } from './strategies/null.strategy';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { WsEventEmitterService } from './services/ws-event-emitter.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigController } from './controllers/config.controller';
var cookieParser = require('cookie-parser');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkspaceEntity,
      WorkflowEntity,
      DocumentEntity,
      NamespaceEntity,
    ]),
    ClientsModule.register([
      {
        name: 'REDIS_PUB_SUB',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 0),
        },
      },
    ]),
    EventEmitterModule.forRoot(),
    LoopCoreModule.forRoot(),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'NO SECRET',
    }),
  ],
  controllers: [
    AuthController,
    ProjectController,
    WorkspaceController,
    ProcessorController,
    WorkflowController,
    DocumentController,
    NamespaceController,
    ConfigController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    NullStrategy,
    WsEventEmitterService,
    ProjectApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    NamespaceApiService,
  ],
  exports: [ProjectApiService, WorkspaceApiService, ProcessorApiService],
})
export class LoopstackApiModule extends ConfigurableModuleClass {
  static setup(
    app: INestApplication,
    options: LoopstackApiConfigPluginOptions = {},
  ): void {
    const corsEnabled = options.cors?.enabled ?? true;
    if (corsEnabled) {
      app.enableCors(
        options.cors?.options ?? {
          origin: true,
          credentials: true,
        } as CorsOptions,
      );
    }

    const swaggerEnabled = options.swagger?.enabled ?? true;
    if (swaggerEnabled) {
      const config =
        options.swagger?.config ??
        new DocumentBuilder()
          .setTitle('Loopstack API Documentation')
          .setDescription('Loopstack API Documentation')
          .setVersion('1.0')
          .build();

      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, documentFactory);
    }

    app.use(cookieParser());
  }
}

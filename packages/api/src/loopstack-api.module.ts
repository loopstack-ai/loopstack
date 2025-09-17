import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { PipelineController } from './controllers/pipeline.controller';
import { PipelineApiService } from './services/pipeline-api.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './controllers/workspace.controller';
import { WorkspaceApiService } from './services/workspace-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/shared';
import { ProcessorController } from './controllers/processor.controller';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoopstackApiConfigPluginOptions } from './interfaces/api-config-options';
import { WorkflowController } from './controllers/workflow.controller';
import { DocumentController } from './controllers/document.controller';
import { WorkflowApiService } from './services/workflow-api.service';
import { DocumentApiService } from './services/document-api.service';
import { NamespaceController } from './controllers/namespace.controller';
import { NamespaceApiService } from './services/namespace-api.service';
import { LoopCoreModule } from '@loopstack/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { NullStrategy } from './strategies/null.strategy';
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
    TypeOrmModule.forFeature([
      PipelineEntity,
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
          port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT ?? '6379', 0) : 6379,
          family: 0
        } as any,
      },
    ]),
    EventEmitterModule.forRoot(),
    LoopCoreModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'NO SECRET',
    }),
  ],
  controllers: [
    PipelineController,
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
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    NamespaceApiService,
  ],
  exports: [PipelineApiService, WorkspaceApiService, ProcessorApiService],
})
export class LoopstackApiModule extends ConfigurableModuleClass {
  static setup(
    app: INestApplication,
    options: LoopstackApiConfigPluginOptions = {},
  ): void {
    const corsEnabled = options.cors?.enabled ?? true;
    if (corsEnabled) {
      app.enableCors(
        options.cors?.options ??
          ({
            origin: true,
            credentials: true,
          } as CorsOptions),
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

    // todo: what does/change
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));

    app.use(cookieParser());
  }
}

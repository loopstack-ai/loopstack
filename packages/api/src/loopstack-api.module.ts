import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { AuthModule, JwtAuthGuard } from '@loopstack/auth';
import { DocumentEntity, NamespaceEntity, PipelineEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { ConfigController } from './controllers/config.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DocumentController } from './controllers/document.controller';
import { FileController } from './controllers/file.controller';
import { NamespaceController } from './controllers/namespace.controller';
import { PipelineController } from './controllers/pipeline.controller';
import { ProcessorController } from './controllers/processor.controller';
import { SseController } from './controllers/sse.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { WorkspaceController } from './controllers/workspace.controller';
import { LoopstackApiConfigPluginOptions } from './interfaces';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { UserService } from './services';
import { DashboardService } from './services/dashboard.service';
import { DocumentApiService } from './services/document-api.service';
import { FileApiService } from './services/file-api.service';
import { FileSystemService } from './services/file-system.service';
import { NamespaceApiService } from './services/namespace-api.service';
import { PipelineApiService } from './services/pipeline-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import { SseEventService } from './services/sse-event.service';
import { WorkflowApiService } from './services/workflow-api.service';
import { WorkspaceApiService } from './services/workspace-api.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntity, WorkspaceEntity, WorkflowEntity, DocumentEntity, NamespaceEntity]),
    EventEmitterModule.forRoot(),
    LoopCoreModule,
    AuthModule.forRoot(),
  ],
  controllers: [
    PipelineController,
    WorkspaceController,
    ProcessorController,
    WorkflowController,
    DocumentController,
    NamespaceController,
    ConfigController,
    DashboardController,
    SseController,
    FileController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    SseEventService,
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    NamespaceApiService,
    DashboardService,
    UserService,
    FileSystemService,
    FileApiService,
  ],
  exports: [
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    DashboardService,
    UserService,
    SseEventService,
  ],
})
export class LoopstackApiModule extends ConfigurableModuleClass {
  static setup(app: INestApplication, options: LoopstackApiConfigPluginOptions = {}): void {
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    app.use(cookieParser());
  }
}

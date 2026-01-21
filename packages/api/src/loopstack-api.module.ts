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
} from '@loopstack/common';
import { ProcessorController } from './controllers/processor.controller';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoopstackApiConfigPluginOptions } from './interfaces';
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
import { SseEventService } from './services/sse-event.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigController } from './controllers/config.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { AuthModule, JwtAuthGuard } from '@loopstack/auth';
import { APP_GUARD } from '@nestjs/core';
import { UserService } from './services';
import { SseController } from './controllers/sse.controller';
const cookieParser = require('cookie-parser');

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkspaceEntity,
      WorkflowEntity,
      DocumentEntity,
      NamespaceEntity,
    ]),
    EventEmitterModule.forRoot(),
    LoopCoreModule,
    AuthModule.forRoot(),
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
    DashboardController,
    SseController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AuthService,
    JwtStrategy,
    NullStrategy,
    SseEventService,
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    NamespaceApiService,
    DashboardService,
    UserService,
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    app.use(cookieParser());
  }
}

import { DynamicModule, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import cors from 'cors';
import { AuthModule, JwtAuthGuard, RolesGuard } from '@loopstack/auth';
import { DocumentEntity, Role, User, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { AdminRoleController } from './controllers/admin-role.controller.js';
import { AdminSystemController } from './controllers/admin-system.controller.js';
import { AdminUserController } from './controllers/admin-user.controller.js';
import { ConfigController } from './controllers/config.controller.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { DocumentController } from './controllers/document.controller.js';
import { ProcessorController } from './controllers/processor.controller.js';
import { SseController } from './controllers/sse.controller.js';
import { WorkflowController } from './controllers/workflow.controller.js';
import { WorkspaceController } from './controllers/workspace.controller.js';
import { ModuleOptionsInterface } from './interfaces/index.js';
import { AdminRoleApiService } from './services/admin-role-api.service.js';
import { AdminSystemApiService } from './services/admin-system-api.service.js';
import { AdminUserApiService } from './services/admin-user-api.service.js';
import { DashboardService } from './services/dashboard.service.js';
import { DocumentApiService } from './services/document-api.service.js';
import { UserService } from './services/index.js';
import { ProcessorApiService } from './services/processor-api.service.js';
import { SseEventService } from './services/sse-event.service.js';
import { WorkflowApiService } from './services/workflow-api.service.js';
import { WorkspaceApiService } from './services/workspace-api.service.js';

const ENTITIES = [WorkspaceEntity, WorkflowEntity, DocumentEntity, User, Role];

const CONTROLLERS = [
  AdminRoleController,
  AdminSystemController,
  AdminUserController,
  WorkspaceController,
  ProcessorController,
  WorkflowController,
  DocumentController,
  ConfigController,
  DashboardController,
  SseController,
];

const PROVIDERS = [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
  AdminRoleApiService,
  AdminSystemApiService,
  AdminUserApiService,
  SseEventService,
  WorkspaceApiService,
  ProcessorApiService,
  WorkflowApiService,
  DocumentApiService,
  DashboardService,
  UserService,
];

const EXPORTS = [
  WorkflowApiService,
  WorkspaceApiService,
  ProcessorApiService,
  DashboardService,
  UserService,
  SseEventService,
];

@Module({})
export class LoopstackApiModule implements NestModule {
  private static corsOptions: cors.CorsOptions | false = { origin: true, credentials: true };

  configure(consumer: MiddlewareConsumer) {
    if (LoopstackApiModule.corsOptions !== false) {
      consumer.apply(cors(LoopstackApiModule.corsOptions)).forRoutes('*');
    }
  }

  static register(options: ModuleOptionsInterface = {}): DynamicModule {
    const connection = options.connection;

    LoopstackApiModule.corsOptions = options.cors !== undefined ? options.cors : { origin: true, credentials: true };

    return {
      module: LoopstackApiModule,
      imports: [TypeOrmModule.forFeature(ENTITIES, connection), AuthModule.forRoot(connection)],
      controllers: CONTROLLERS,
      providers: PROVIDERS,
      exports: EXPORTS,
    };
  }
}

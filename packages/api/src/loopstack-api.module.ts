import { DynamicModule, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import cors from 'cors';
import { AuthModule, JwtAuthGuard, RolesGuard } from '@loopstack/auth';
import {
  DocumentEntity,
  Role,
  User,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';
import { AdminRoleController } from './controllers/admin-role.controller';
import { AdminSystemController } from './controllers/admin-system.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { ConfigController } from './controllers/config.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DocumentController } from './controllers/document.controller';
import { ProcessorController } from './controllers/processor.controller';
import { SseController } from './controllers/sse.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { WorkspaceController } from './controllers/workspace.controller';
import { ModuleOptionsInterface } from './interfaces';
import { UserService } from './services';
import { AdminRoleApiService } from './services/admin-role-api.service';
import { AdminSystemApiService } from './services/admin-system-api.service';
import { AdminUserApiService } from './services/admin-user-api.service';
import { DashboardService } from './services/dashboard.service';
import { DocumentApiService } from './services/document-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import { SseEventService } from './services/sse-event.service';
import { WorkflowApiService } from './services/workflow-api.service';
import { WorkspaceApiService } from './services/workspace-api.service';
import { LOOPSTACK_AVAILABLE_ENVIRONMENTS } from './tokens';

const ENTITIES = [WorkspaceEntity, WorkspaceEnvironmentEntity, WorkflowEntity, DocumentEntity, User, Role];

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
  {
    provide: LOOPSTACK_AVAILABLE_ENVIRONMENTS,
    useValue: [],
  },
];

const EXPORTS = [
  WorkflowApiService,
  WorkspaceApiService,
  ProcessorApiService,
  DashboardService,
  UserService,
  SseEventService,
  LOOPSTACK_AVAILABLE_ENVIRONMENTS,
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

    const providers: DynamicModule['providers'] = [...PROVIDERS];
    if (options.availableEnvironments) {
      providers.push({
        provide: LOOPSTACK_AVAILABLE_ENVIRONMENTS,
        useValue: options.availableEnvironments,
      });
    }

    return {
      module: LoopstackApiModule,
      imports: [TypeOrmModule.forFeature(ENTITIES, connection), AuthModule.forRoot(connection)],
      controllers: CONTROLLERS,
      providers,
      exports: EXPORTS,
    };
  }
}

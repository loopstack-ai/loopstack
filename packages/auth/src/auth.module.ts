import { DynamicModule, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import type { StringValue } from 'ms';
import { ApiTokenEntity, Role, User } from '@loopstack/common';
import { AssignRoleCommand } from './commands/assign-role.command.js';
import { ApiTokenController, AuthController } from './controllers/index.js';
import { JwtAuthGuard, RolesGuard } from './guards/index.js';
import { UserRepository } from './repositories/index.js';
import { ConfigValidationService } from './services/config-validation.service.js';
import { ApiTokenService, AuthService, TokenService } from './services/index.js';
import { HubStrategy, JwtStrategy } from './strategies/index.js';

@Module({})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');
  }

  static forRoot(connection?: string): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('auth.jwt.secret'),
            signOptions: {
              expiresIn: configService.get<StringValue | number | undefined>('auth.jwt.expiresIn') || '1h',
            },
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, Role, ApiTokenEntity], connection),
      ],
      controllers: [ApiTokenController, AuthController],
      providers: [
        ConfigValidationService,
        ApiTokenService,
        AuthService,
        UserRepository,
        TokenService,
        JwtStrategy,
        HubStrategy,
        JwtAuthGuard,
        RolesGuard,
        AssignRoleCommand,
      ],
      exports: [ApiTokenService, AuthService, UserRepository, JwtAuthGuard, RolesGuard],
    };
  }
}

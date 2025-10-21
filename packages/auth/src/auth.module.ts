import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService, TokenService, HubService } from './services';
import { JwtStrategy, HubStrategy } from './strategies';
import { AuthController } from './controllers';
import { UserRepository } from './repositories';
import { AuthConfig } from './interfaces';
import { AUTH_CONFIG } from './constants';
import { Permission, Role, User } from '@loopstack/shared';
import { ConfigValidationService } from './services/config-validation.service';
import { HubAuditService } from './services/hub-audit.service';
import { ConditionalAuthGuard } from './guards';
import { JwtAuthGuard } from './guards';
import { LocalDevModeGuard } from './guards/local-dev-mode.guard';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return this.forRootAsync();
  }

  static forRootAsync(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('auth.jwt.secret'),
            signOptions: {
              expiresIn: configService.get<any>('auth.jwt.expiresIn') || '1h'
            },
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, Permission, Role]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useFactory: (configService: ConfigService) => configService.get<AuthConfig>('auth'),
          inject: [ConfigService],
        },
        ConfigValidationService,
        AuthService,
        UserRepository,
        TokenService,
        JwtStrategy,
        HubService,
        HubStrategy,
        HubAuditService,
        JwtAuthGuard,
        LocalDevModeGuard,
        ConditionalAuthGuard,
      ],
      exports: [AuthService, UserRepository, JwtAuthGuard, LocalDevModeGuard, ConditionalAuthGuard],
    };
  }
}
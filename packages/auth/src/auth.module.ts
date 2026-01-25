import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { Permission, Role, User } from '@loopstack/common';
import { AuthController } from './controllers';
import { JwtAuthGuard } from './guards';
import { UserRepository } from './repositories';
import { AuthService, HubService, TokenService } from './services';
import { ConfigValidationService } from './services/config-validation.service';
import { HubAuditService } from './services/hub-audit.service';
import { HubStrategy, JwtStrategy } from './strategies';

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
              expiresIn: configService.get<StringValue | number | undefined>('auth.jwt.expiresIn') || '1h',
            },
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, Permission, Role]),
      ],
      controllers: [AuthController],
      providers: [
        ConfigValidationService,
        AuthService,
        UserRepository,
        TokenService,
        JwtStrategy,
        HubService,
        HubStrategy,
        HubAuditService,
        JwtAuthGuard,
      ],
      exports: [AuthService, UserRepository, JwtAuthGuard],
    };
  }
}

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { Role, User } from '@loopstack/common';
import { AssignRoleCommand } from './commands/assign-role.command';
import { AuthController } from './controllers';
import { JwtAuthGuard, RolesGuard } from './guards';
import { UserRepository } from './repositories';
import { AuthService, TokenService } from './services';
import { ConfigValidationService } from './services/config-validation.service';
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
        TypeOrmModule.forFeature([User, Role]),
      ],
      controllers: [AuthController],
      providers: [
        ConfigValidationService,
        AuthService,
        UserRepository,
        TokenService,
        JwtStrategy,
        HubStrategy,
        JwtAuthGuard,
        RolesGuard,
        AssignRoleCommand,
      ],
      exports: [AuthService, UserRepository, JwtAuthGuard, RolesGuard],
    };
  }
}

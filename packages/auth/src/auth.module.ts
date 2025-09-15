import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService, TokenService, HubService } from './services';
import { JwtStrategy, HubStrategy } from './strategies';
import { AuthController } from './controllers';
import { UserRepository } from './repositories';
import { AuthConfig } from './interfaces';
import { AUTH_CONFIG } from './constants';
import { Permission, Role, User } from '@loopstack/shared';

@Module({})
export class AuthModule {
  static forRoot(config: AuthConfig): DynamicModule {
    const strategies: any[] = [];

    if (config.strategies.includes('jwt' as any)) {
      strategies.push(JwtStrategy);
    }

    if (config.strategies.includes('hub' as any)) {
      strategies.push(HubStrategy);
    }

    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: config.jwt?.secret,
          signOptions: { expiresIn: config.jwt?.expiresIn || '1h' },
        }),
        TypeOrmModule.forFeature([User, Permission, Role]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: config,
        },
        AuthService,
        UserRepository,
        TokenService,
        HubService,
        ...strategies,
      ],
      exports: [AuthService, UserRepository],
    };
  }
}
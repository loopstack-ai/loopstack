import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService, PasswordService, TokenService, OAuthService } from './services';
import { LocalStrategy, JwtStrategy, GoogleStrategy, DevStrategy } from './strategies';
import { AuthController } from './controllers';
import { UserRepository } from './repositories';
import { AuthConfig } from './interfaces';
import { AUTH_CONFIG } from './constants';
import { AuthProvider, Permission, Role, User } from '@loopstack/shared';
import { AuthProviderRepository } from './repositories/auth-provider.repository';

@Module({})
export class AuthModule {
  static forRoot(config: AuthConfig): DynamicModule {
    const strategies: any[] = [];

    if (config.strategies.includes('local' as any)) {
      strategies.push(LocalStrategy);
    }

    if (config.strategies.includes('jwt' as any)) {
      strategies.push(JwtStrategy);
    }

    if (config.strategies.includes('google' as any) && config.oauth?.google) {
      strategies.push(GoogleStrategy);
    }

    if (config.strategies.includes('dev' as any)) {
      strategies.push(DevStrategy);
    }

    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: config.jwt?.secret,
          signOptions: { expiresIn: config.jwt?.expiresIn || '1h' },
        }),
        TypeOrmModule.forFeature([User, Permission, Role, AuthProvider]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_CONFIG,
          useValue: config,
        },
        AuthService,
        OAuthService,
        UserRepository,
        AuthProviderRepository,
        PasswordService,
        TokenService,
        ...strategies,
      ],
      exports: [AuthService, UserRepository],
    };
  }

  // static forRoot(config: AuthConfig): DynamicModule {
  //   return {
  //     module: AuthModule,
  //     imports: [
  //       PassportModule.register({ defaultStrategy: config.strategy }),
  //       JwtModule.register({
  //         secret: config.jwt?.secret,
  //         signOptions: { expiresIn: config.jwt?.expiresIn || '1h' },
  //       }),
  //       TypeOrmModule.forFeature([User, Permission, Role]),
  //     ],
  //     controllers: [AuthController],
  //     providers: [
  //       {
  //         provide: AUTH_CONFIG,
  //         useValue: config,
  //       },
  //       AuthService,
  //       UserRepository,
  //       PasswordService,
  //       TokenService,
  //       LocalStrategy,
  //       JwtStrategy,
  //     ],
  //     exports: [AuthService, UserRepository],
  //   };
  // }
}
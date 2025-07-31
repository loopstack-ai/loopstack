import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Inject } from '@nestjs/common';
import { AUTH_CONFIG } from '../constants';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthConfig } from '../interfaces';
import { OAuthProfileInterface } from '@loopstack/shared';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(AUTH_CONFIG) config: AuthConfig) {
    super({
      clientID: config.oauth?.google?.clientId,
      clientSecret: config.oauth?.google?.clientSecret,
      callbackURL: config.oauth?.google?.callbackUrl,
      scope: config.oauth?.google?.scope || ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user: OAuthProfileInterface = {
      id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      displayName: profile.displayName,
      photos,
      provider: 'google',
      _raw: profile._raw,
      _json: profile._json,
    };

    done(null, user);
  }
}
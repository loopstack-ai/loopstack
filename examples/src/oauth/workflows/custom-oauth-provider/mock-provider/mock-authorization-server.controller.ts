import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { Public } from '@loopstack/common';
import { MOCK_CLIENT_ID, MOCK_CLIENT_SECRET, MOCK_SERVER_PATH, oauthCallbackUrl } from './mock-provider.config';

const SUPPORTED_SCOPES = ['profile'];
const CODE_TTL_MS = 60_000;
const ACCESS_TOKEN_TTL_SECONDS = 3600;

interface Grant {
  scope: string;
  expiresAt: number;
}

interface TokenRequest {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
}

/**
 * A mock OAuth 2.0 authorization server inside the examples app, so the custom provider example runs
 * without an account at a real service. It knows one client and one scope, keeps codes and tokens in
 * memory, and has no login: the consent page signs in a fixed example user.
 */
@Controller(MOCK_SERVER_PATH)
export class MockAuthorizationServerController {
  private readonly codes = new Map<string, Grant>();
  private readonly accessTokens = new Map<string, Grant>();
  /** Refresh token → scope. Refresh tokens do not expire. */
  private readonly refreshTokens = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  /** The page the authorization URL opens: the user allows or denies the access the app asks for. */
  @Public()
  @Get('authorize')
  @Header('Content-Type', 'text/html; charset=utf-8')
  authorize(
    @Query('response_type') responseType?: string,
    @Query('client_id') clientId?: string,
    @Query('redirect_uri') redirectUri?: string,
    @Query('scope') scope?: string,
    @Query('state') state?: string,
  ): string {
    // An unknown client or redirect URI gets an error, never a redirect.
    const scopes = scope?.split(' ') ?? [];
    if (
      responseType !== 'code' ||
      clientId !== MOCK_CLIENT_ID ||
      redirectUri !== oauthCallbackUrl(this.configService) ||
      !scopes.every((s) => SUPPORTED_SCOPES.includes(s)) ||
      !state
    ) {
      throw new BadRequestException({ error: 'invalid_request' });
    }

    const code = randomBytes(16).toString('hex');
    this.codes.set(code, { scope: scopes.join(' '), expiresAt: Date.now() + CODE_TTL_MS });
    const allow = `${redirectUri}?${new URLSearchParams({ code, state }).toString()}`;
    const deny = `${redirectUri}?${new URLSearchParams({ error: 'access_denied', state }).toString()}`;

    return (
      `<!doctype html><html><head><meta charset="utf-8"><title>Mock Provider</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:400px;margin:64px auto;text-align:center">` +
      `<p style="font-size:18px;font-weight:500">Loopstack Examples asks to read your profile.</p>` +
      `<p><a id="allow" href="${escapeAttribute(allow)}">Allow</a> · ` +
      `<a id="deny" href="${escapeAttribute(deny)}">Deny</a></p>` +
      `</body></html>`
    );
  }

  /** Exchanges a code or a refresh token for an access token, as the provider requests it. */
  @Public()
  @Post('token')
  @HttpCode(200)
  token(@Body() body: TokenRequest) {
    if (body.client_id !== MOCK_CLIENT_ID || body.client_secret !== MOCK_CLIENT_SECRET) {
      throw new UnauthorizedException({ error: 'invalid_client' });
    }

    if (body.grant_type === 'authorization_code') {
      const grant = body.code ? this.codes.get(body.code) : undefined;
      // A code is single-use.
      if (body.code) this.codes.delete(body.code);
      if (!grant || grant.expiresAt < Date.now() || body.redirect_uri !== oauthCallbackUrl(this.configService)) {
        throw new BadRequestException({ error: 'invalid_grant', error_description: 'Unknown or expired code.' });
      }
      const refreshToken = randomBytes(16).toString('hex');
      this.refreshTokens.set(refreshToken, grant.scope);
      return { ...this.issueAccessToken(grant.scope), refresh_token: refreshToken };
    }

    if (body.grant_type === 'refresh_token') {
      const scope = body.refresh_token ? this.refreshTokens.get(body.refresh_token) : undefined;
      if (scope === undefined) {
        throw new BadRequestException({ error: 'invalid_grant', error_description: 'Unknown refresh token.' });
      }
      return this.issueAccessToken(scope);
    }

    throw new BadRequestException({ error: 'unsupported_grant_type' });
  }

  /** The protected API: answers only a request with a valid access token. */
  @Public()
  @Get('api/profile')
  profile(@Headers('authorization') authorization?: string) {
    const grant = this.accessTokens.get(authorization?.replace(/^Bearer /, '') ?? '');
    if (!grant || grant.expiresAt < Date.now() || !grant.scope.split(' ').includes('profile')) {
      throw new UnauthorizedException({ error: 'invalid_token' });
    }
    return { id: 'mock-user-1', name: 'Ada Lovelace', email: 'ada@example.com' };
  }

  private issueAccessToken(scope: string) {
    const accessToken = randomBytes(16).toString('hex');
    this.accessTokens.set(accessToken, { scope, expiresAt: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000 });
    return { access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL_SECONDS, scope };
  }
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

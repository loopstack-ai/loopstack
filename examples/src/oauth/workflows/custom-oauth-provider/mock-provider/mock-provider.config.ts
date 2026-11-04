import { ConfigService } from '@nestjs/config';

/** The client the mock server knows. A provider for a real service reads these from its config. */
export const MOCK_CLIENT_ID = 'loopstack-examples';
export const MOCK_CLIENT_SECRET = 'mock-client-secret';

export const MOCK_SERVER_PATH = 'oauth-examples/mock-provider';

/** The mock server runs inside this app, so it shares the app's base URL with the OAuth callback. */
function appBaseUrl(configService: ConfigService): string {
  return `http://localhost:${configService.get('PORT') ?? 3000}`;
}

export function mockServerUrl(configService: ConfigService): string {
  return `${appBaseUrl(configService)}/${MOCK_SERVER_PATH}`;
}

/** The public callback of `OAuthModule`, which completes the flow from `code` and `state`. */
export function oauthCallbackUrl(configService: ConfigService): string {
  return `${appBaseUrl(configService)}/api/v1/oauth/callback`;
}

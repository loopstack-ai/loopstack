import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { GoogleAuthService } from '../services';

export type ExchangeGoogleOAuthTokenArgs = {
  code: string;
  state: string;
  expectedState: string;
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

@Tool({
  config: {
    description:
      'Exchanges a Google OAuth 2.0 authorization code for access and refresh tokens, and stores them globally for the user.',
  },
})
export class ExchangeGoogleOAuthTokenTool implements ToolInterface {
  private readonly logger = new Logger(ExchangeGoogleOAuthTokenTool.name);

  @Inject()
  private googleAuthService: GoogleAuthService;

  @Input({
    schema: z
      .object({
        code: z.string(),
        state: z.string(),
        expectedState: z.string(),
      })
      .strict(),
  })
  args: ExchangeGoogleOAuthTokenArgs;

  async execute(
    args: ExchangeGoogleOAuthTokenArgs,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    if (args.state !== args.expectedState) {
      throw new Error('OAuth state mismatch. Possible CSRF attack.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: args.code,
        client_id: this.googleAuthService.clientId,
        client_secret: this.googleAuthService.clientSecret,
        redirect_uri: this.googleAuthService.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`Google token exchange failed: ${response.statusText}`);
    }

    const tokens: GoogleTokenResponse = (await response.json()) as GoogleTokenResponse;

    // Store tokens globally for this user
    this.googleAuthService.storeTokens(ctx.userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
    });

    return {
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
      },
    };
  }
}

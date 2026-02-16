import { Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { GoogleAuthService } from '../services';

export type BuildGoogleOAuthUrlArgs = {
  scopes: string[];
};

@Tool({
  config: {
    description: 'Builds a Google OAuth 2.0 authorization URL with state parameter for CSRF protection.',
  },
})
export class BuildGoogleOAuthUrlTool implements ToolInterface {
  @Inject()
  private googleAuthService: GoogleAuthService;

  @Input({
    schema: z
      .object({
        scopes: z.array(z.string()),
      })
      .strict(),
  })
  args: BuildGoogleOAuthUrlArgs;

  async execute(args: BuildGoogleOAuthUrlArgs): Promise<ToolResult> {
    const state = randomBytes(32).toString('hex');

    const DEFAULT_SCOPES = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];
    const scopes = args.scopes?.length ? args.scopes : DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: this.googleAuthService.clientId,
      redirect_uri: this.googleAuthService.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return {
      data: { authUrl, state },
    };
  }
}

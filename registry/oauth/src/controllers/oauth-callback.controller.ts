import { BadRequestException, Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { Public, ZodValidationPipe } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { OAuthSessionService } from '../services/index.js';

const CompleteOAuthSchema = z
  .object({
    code: z.string().min(1),
    state: z.string().min(1),
  })
  .strict();

type CompleteOAuthPayload = z.infer<typeof CompleteOAuthSchema>;

/**
 * Public OAuth callback endpoints that complete the authorization-code flow
 * from `code` + `state` alone: the state token (unguessable, single-use,
 * 10 minute TTL, re-validated by the workflow's own `expectedState` check)
 * resolves the pending `OAuthWorkflow`, whose `exchangeToken` transition is
 * fired server-side as the user who started the flow.
 *
 * Two entry points, same completion:
 * - `GET /api/v1/oauth/callback` — a provider redirect target
 *   (`*_OAUTH_REDIRECT_URI=<api>/api/v1/oauth/callback`); renders a minimal
 *   "connected" page. Works without the Studio frontend — CLI-printed auth
 *   URLs and headless deployments complete here.
 * - `POST /api/v1/oauth/complete` — JSON variant used by Studio's callback
 *   page when it was opened without a popup opener (e.g. from a CLI link
 *   while the redirect URI still points at Studio).
 *
 * @providedBy OAuthModule
 * @public
 */
@Controller('api/v1/oauth')
export class OAuthCallbackController {
  private readonly logger = new Logger(OAuthCallbackController.name);

  constructor(
    private readonly sessions: OAuthSessionService,
    private readonly workflowRunner: WorkflowRunner,
  ) {}

  @Public()
  @Post('complete')
  async complete(
    @Body(new ZodValidationPipe(CompleteOAuthSchema)) payload: CompleteOAuthPayload,
  ): Promise<{ ok: true; provider: string }> {
    const provider = await this.fireExchange(payload.code, payload.state);
    return { ok: true, provider };
  }

  @Public()
  @Get('callback')
  async callback(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ): Promise<void> {
    if (error) {
      // Provider-side denial/cancel — the workflow stays waiting; a fresh
      // run builds a fresh URL. Nothing to consume.
      this.renderPage(res, 400, 'Sign-in not completed', errorDescription ?? error);
      return;
    }
    if (!code || !state) {
      this.renderPage(res, 400, 'Invalid callback', 'Missing code or state parameter.');
      return;
    }

    try {
      const provider = await this.fireExchange(code, state);
      // The exchange runs asynchronously in the workflow — the page reports
      // receipt, the workflow's own prompt document reports the outcome.
      this.renderPage(
        res,
        200,
        `Sign-in with ${provider} received`,
        'Completing the connection — you can close this window.',
        true,
      );
    } catch (err) {
      const message = err instanceof BadRequestException ? err.message : 'Could not complete the sign-in.';
      this.renderPage(res, 400, 'Sign-in not completed', message);
    }
  }

  /** Resolves the pending flow by state and fires its `exchangeToken` transition. */
  private async fireExchange(code: string, state: string): Promise<string> {
    const session = await this.sessions.consume(state);
    if (!session) {
      throw new BadRequestException('This sign-in link has expired or was already used.');
    }

    await this.workflowRunner.runById(session.workflowId, session.userId, {
      transition: {
        id: 'exchangeToken',
        workflowId: session.workflowId,
        // Same envelope shape user-driven transitions get from the API, so
        // the wait transition sees a consistent TransitionInput.
        payload: {
          workflowId: session.workflowId,
          status: 'completed',
          hasError: false,
          errorMessage: null,
          data: { code, state },
        },
      },
    });

    this.logger.log(`OAuth callback completed for provider ${session.provider} (workflow ${session.workflowId})`);
    return session.provider;
  }

  private renderPage(res: Response, status: number, title: string, message: string, autoClose = false): void {
    res
      .status(status)
      .type('html')
      .send(
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
          `<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif">` +
          `<div style="text-align:center;max-width:400px;padding:24px">` +
          `<p style="font-size:18px;font-weight:500">${title}</p>` +
          `<p style="color:#666;margin-top:8px">${message}</p>` +
          `</div>` +
          (autoClose ? `<script>setTimeout(function(){window.close()},2000)</script>` : '') +
          `</body></html>`,
      );
  }
}

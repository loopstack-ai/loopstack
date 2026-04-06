import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    to: z.array(z.string()),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    subject: z.string(),
    body: z.string(),
    htmlBody: z.string().optional(),
  })
  .strict();

export type GmailSendMessageArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description: 'Sends a new email via Gmail. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GmailSendMessageTool extends BaseTool {
  private readonly logger = new Logger(GmailSendMessageTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GmailSendMessageArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const rawMessage = this.buildMimeMessage(args);
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Gmail API returned ${response.status} for user ${this.ctx.context.userId}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Gmail API error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Gmail API error: ${response.statusText}`,
        },
      };
    }

    const result = (await response.json()) as {
      id: string;
      threadId: string;
      labelIds: string[];
    };

    return {
      data: {
        id: result.id,
        threadId: result.threadId,
        labelIds: result.labelIds,
      },
    };
  }

  private buildMimeMessage(args: GmailSendMessageArgs): string {
    const headers = [`To: ${args.to.join(', ')}`, `Subject: ${args.subject}`, 'MIME-Version: 1.0'];

    if (args.cc?.length) headers.push(`Cc: ${args.cc.join(', ')}`);
    if (args.bcc?.length) headers.push(`Bcc: ${args.bcc.join(', ')}`);

    if (args.htmlBody) {
      const boundary = `boundary_${Date.now()}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      return [
        headers.join('\r\n'),
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        args.body,
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        args.htmlBody,
        `--${boundary}--`,
      ].join('\r\n');
    }

    headers.push('Content-Type: text/plain; charset="UTF-8"');
    return [headers.join('\r\n'), '', args.body].join('\r\n');
  }
}

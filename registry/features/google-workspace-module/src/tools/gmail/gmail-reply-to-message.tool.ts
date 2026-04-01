import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GmailReplyToMessageArgs = {
  messageId: string;
  threadId: string;
  body: string;
  htmlBody?: string;
  replyAll?: boolean;
};

@Tool({
  config: {
    description:
      'Replies to an existing Gmail message in-thread. Fetches the original message to set proper headers. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GmailReplyToMessageTool extends BaseTool {
  private readonly logger = new Logger(GmailReplyToMessageTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        messageId: z.string(),
        threadId: z.string(),
        body: z.string(),
        htmlBody: z.string().optional(),
        replyAll: z.boolean().default(false),
      })
      .strict(),
  })
  args: GmailReplyToMessageArgs;

  async run(args: GmailReplyToMessageArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    // Fetch original message headers
    const originalResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${args.messageId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Message-ID`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (originalResponse.status === 401 || originalResponse.status === 403) {
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!originalResponse.ok) {
      const body = await originalResponse.text();
      this.logger.error(`Gmail API error fetching original message: ${originalResponse.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Gmail API error: ${originalResponse.statusText}`,
        },
      };
    }

    const originalData = (await originalResponse.json()) as {
      payload: {
        headers: Array<{ name: string; value: string }>;
      };
    };

    const getHeader = (name: string): string =>
      originalData.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

    const originalFrom = getHeader('From');
    const originalTo = getHeader('To');
    const originalCc = getHeader('Cc');
    const originalSubject = getHeader('Subject');
    const originalMessageId = getHeader('Message-ID');

    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    const replyTo = args.replyAll ? [originalFrom, originalTo].filter(Boolean).join(', ') : originalFrom;

    const rawMessage = this.buildReplyMimeMessage({
      to: replyTo,
      cc: args.replyAll ? originalCc : undefined,
      subject,
      inReplyTo: originalMessageId,
      references: originalMessageId,
      body: args.body,
      htmlBody: args.htmlBody,
    });

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
      body: JSON.stringify({
        raw: encodedMessage,
        threadId: args.threadId,
      }),
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Gmail API returned ${response.status} for user ${this.context.userId}`);
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

  private buildReplyMimeMessage(params: {
    to: string;
    cc?: string;
    subject: string;
    inReplyTo: string;
    references: string;
    body: string;
    htmlBody?: string;
  }): string {
    const headers = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `In-Reply-To: ${params.inReplyTo}`,
      `References: ${params.references}`,
      'MIME-Version: 1.0',
    ];

    if (params.cc) headers.push(`Cc: ${params.cc}`);

    if (params.htmlBody) {
      const boundary = `boundary_${Date.now()}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      return [
        headers.join('\r\n'),
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        params.body,
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        params.htmlBody,
        `--${boundary}--`,
      ].join('\r\n');
    }

    headers.push('Content-Type: text/plain; charset="UTF-8"');
    return [headers.join('\r\n'), '', params.body].join('\r\n');
  }
}

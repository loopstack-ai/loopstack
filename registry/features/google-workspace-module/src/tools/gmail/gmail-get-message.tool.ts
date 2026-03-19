import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GmailGetMessageArgs = {
  messageId: string;
  format?: 'full' | 'metadata' | 'minimal';
};

interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body: { attachmentId?: string; size: number; data?: string };
  parts?: GmailMessagePart[];
}

@Tool({
  config: {
    description:
      'Gets the full content of a single Gmail message, including body text and attachment metadata. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GmailGetMessageTool implements ToolInterface {
  private readonly logger = new Logger(GmailGetMessageTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        messageId: z.string(),
        format: z.enum(['full', 'metadata', 'minimal']).default('full'),
      })
      .strict(),
  })
  args: GmailGetMessageArgs;

  async execute(args: GmailGetMessageArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const format = args.format || 'full';
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${args.messageId}?format=${format}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Gmail API returned ${response.status} for user ${ctx.userId}`);
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

    const msgData = (await response.json()) as {
      id: string;
      threadId: string;
      snippet: string;
      labelIds: string[];
      payload: GmailMessagePart;
    };

    const getHeader = (name: string): string =>
      msgData.payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

    const body = this.extractBody(msgData.payload);
    const attachments = this.extractAttachments(msgData.payload);

    return {
      data: {
        id: msgData.id,
        threadId: msgData.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        cc: getHeader('Cc'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        body,
        snippet: msgData.snippet,
        labelIds: msgData.labelIds,
        attachments,
      },
    };
  }

  private extractBody(part: GmailMessagePart): string {
    if (part.mimeType === 'text/plain' && part.body.data) {
      return this.decodeBase64Url(part.body.data);
    }

    if (part.parts) {
      for (const child of part.parts) {
        if (child.mimeType === 'text/plain' && child.body.data) {
          return this.decodeBase64Url(child.body.data);
        }
      }
      for (const child of part.parts) {
        const nested = this.extractBody(child);
        if (nested) return nested;
      }
    }

    if (part.mimeType === 'text/html' && part.body.data) {
      return this.decodeBase64Url(part.body.data);
    }

    return '';
  }

  private extractAttachments(part: GmailMessagePart): Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const attachments: Array<{
      attachmentId: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];

    if (part.body.attachmentId && part.filename) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      });
    }

    if (part.parts) {
      for (const child of part.parts) {
        attachments.push(...this.extractAttachments(child));
      }
    }

    return attachments;
  }

  private decodeBase64Url(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}

import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GmailSearchMessagesArgs = {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
};

@Tool({
  config: {
    description:
      'Searches Gmail messages using Gmail query syntax. Returns message summaries with headers and snippets. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GmailSearchMessagesTool extends BaseTool {
  private readonly logger = new Logger(GmailSearchMessagesTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        query: z.string().optional(),
        labelIds: z.array(z.string()).optional(),
        maxResults: z.number().default(10),
        pageToken: z.string().optional(),
      })
      .strict(),
  })
  args: GmailSearchMessagesArgs;

  async run(args: GmailSearchMessagesArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams({
      maxResults: String(args.maxResults ?? 10),
    });
    if (args.query) params.set('q', args.query);
    if (args.pageToken) params.set('pageToken', args.pageToken);
    if (args.labelIds) {
      for (const label of args.labelIds) {
        params.append('labelIds', label);
      }
    }

    const listResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (listResponse.status === 401 || listResponse.status === 403) {
      const body = await listResponse.text();
      this.logger.warn(`Gmail API returned ${listResponse.status} for user ${this.context.userId}: ${body}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!listResponse.ok) {
      const body = await listResponse.text();
      this.logger.error(`Gmail API error: ${listResponse.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Gmail API error: ${listResponse.statusText}`,
        },
      };
    }

    const listData = (await listResponse.json()) as {
      messages?: Array<{ id: string; threadId: string }>;
      nextPageToken?: string;
    };

    if (!listData.messages || listData.messages.length === 0) {
      return {
        data: { messages: [], nextPageToken: listData.nextPageToken },
      };
    }

    const messages = await Promise.all(
      listData.messages.map(async (msg) => {
        const msgResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!msgResponse.ok) {
          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: '',
            from: '',
            to: '',
            subject: '',
            date: '',
          };
        }

        const msgData = (await msgResponse.json()) as {
          id: string;
          threadId: string;
          snippet: string;
          payload: {
            headers: Array<{ name: string; value: string }>;
          };
        };

        const getHeader = (name: string): string =>
          msgData.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
        };
      }),
    );

    return {
      data: { messages, nextPageToken: listData.nextPageToken },
    };
  }
}

import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GoogleDriveListFilesArgs = {
  query?: string;
  folderId?: string;
  maxResults?: number;
  pageToken?: string;
  orderBy?: string;
};

@Tool({
  config: {
    description:
      'Lists and searches files in Google Drive. Supports Drive query syntax and folder browsing. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GoogleDriveListFilesTool extends BaseTool {
  private readonly logger = new Logger(GoogleDriveListFilesTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        query: z.string().optional(),
        folderId: z.string().optional(),
        maxResults: z.number().default(20),
        pageToken: z.string().optional(),
        orderBy: z.string().optional(),
      })
      .strict(),
  })
  args: GoogleDriveListFilesArgs;

  async run(args: GoogleDriveListFilesArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const queryParts: string[] = [];
    if (args.query) queryParts.push(args.query);
    if (args.folderId) queryParts.push(`'${args.folderId}' in parents`);

    const params = new URLSearchParams({
      pageSize: String(args.maxResults ?? 20),
      fields: 'files(id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents),nextPageToken',
    });

    if (queryParts.length > 0) params.set('q', queryParts.join(' and '));
    if (args.pageToken) params.set('pageToken', args.pageToken);
    if (args.orderBy) params.set('orderBy', args.orderBy);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Drive API returned ${response.status} for user ${this.context.userId}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Google Drive API error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Google Drive API error: ${response.statusText}`,
        },
      };
    }

    const data = (await response.json()) as {
      files: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime: string;
        createdTime: string;
        owners?: Array<{ displayName: string; emailAddress: string }>;
        webViewLink?: string;
      }>;
      nextPageToken?: string;
    };

    const files = data.files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      createdTime: file.createdTime,
      owners: file.owners?.map((o) => ({ displayName: o.displayName, email: o.emailAddress })),
      webViewLink: file.webViewLink,
    }));

    return {
      data: { files, nextPageToken: data.nextPageToken },
    };
  }
}

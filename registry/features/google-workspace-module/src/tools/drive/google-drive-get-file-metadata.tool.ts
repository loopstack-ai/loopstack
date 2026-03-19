import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GoogleDriveGetFileMetadataArgs = {
  fileId: string;
};

@Tool({
  config: {
    description:
      'Gets detailed metadata for a single Google Drive file. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GoogleDriveGetFileMetadataTool implements ToolInterface {
  private readonly logger = new Logger(GoogleDriveGetFileMetadataTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        fileId: z.string(),
      })
      .strict(),
  })
  args: GoogleDriveGetFileMetadataArgs;

  async execute(args: GoogleDriveGetFileMetadataArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const fields =
      'id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents,description,shared,permissions';
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}?fields=${fields}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Drive API returned ${response.status} for user ${ctx.userId}`);
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

    const file = (await response.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime: string;
      createdTime: string;
      owners?: Array<{ displayName: string; emailAddress: string }>;
      webViewLink?: string;
      parents?: string[];
      description?: string;
      shared?: boolean;
    };

    return {
      data: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        owners: file.owners?.map((o) => ({ displayName: o.displayName, email: o.emailAddress })),
        webViewLink: file.webViewLink,
        parents: file.parents,
        description: file.description,
        shared: file.shared,
      },
    };
  }
}

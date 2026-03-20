import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GoogleDriveUploadFileArgs = {
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
  description?: string;
};

@Tool({
  config: {
    description:
      'Uploads a new file to Google Drive using multipart upload. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GoogleDriveUploadFileTool implements ToolInterface {
  private readonly logger = new Logger(GoogleDriveUploadFileTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        name: z.string(),
        content: z.string(),
        mimeType: z.string().default('text/plain'),
        folderId: z.string().optional(),
        description: z.string().optional(),
      })
      .strict(),
  })
  args: GoogleDriveUploadFileArgs;

  async execute(args: GoogleDriveUploadFileArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const metadata: Record<string, unknown> = { name: args.name };
    if (args.folderId) metadata.parents = [args.folderId];
    if (args.description) metadata.description = args.description;

    const mimeType = args.mimeType || 'text/plain';
    const boundary = `boundary_${Date.now()}`;

    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      args.content,
      `--${boundary}--`,
    ].join('\r\n');

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody,
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
      webViewLink?: string;
    };

    return {
      data: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
      },
    };
  }
}

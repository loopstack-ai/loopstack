import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    name: z.string(),
    content: z.string(),
    mimeType: z.string().default('text/plain'),
    folderId: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export type GoogleDriveUploadFileArgs = z.infer<typeof inputSchema>;

export type GoogleDriveUploadFileResult =
  | { id: string; name: string; mimeType: string; webViewLink?: string }
  | { error: 'unauthorized'; message: string }
  | { error: 'api_error'; message: string };

@Tool({
  name: 'google_drive_upload_file',
  description:
    'Uploads a new file to Google Drive using multipart upload. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GoogleDriveUploadFileTool extends BaseTool<
  GoogleDriveUploadFileArgs,
  object,
  GoogleDriveUploadFileResult
> {
  private readonly logger = new Logger(GoogleDriveUploadFileTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(args: GoogleDriveUploadFileArgs): Promise<ToolResult<GoogleDriveUploadFileResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.userId, 'google');

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
      this.logger.warn(`Google Drive API returned ${response.status} for user ${this.ctx.userId}`);
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

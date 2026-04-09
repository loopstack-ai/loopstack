import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    fileId: z.string(),
    exportMimeType: z.string().optional(),
  })
  .strict();

export type GoogleDriveDownloadFileArgs = z.infer<typeof inputSchema>;

const GOOGLE_DOCS_EXPORT_DEFAULTS: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
};

@Tool({
  uiConfig: {
    description:
      'Downloads or exports a file from Google Drive. Automatically handles Google Docs/Sheets/Slides export. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GoogleDriveDownloadFileTool extends BaseTool {
  private readonly logger = new Logger(GoogleDriveDownloadFileTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GoogleDriveDownloadFileArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // First, get file metadata to determine the mime type
    const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}?fields=mimeType,name`, {
      headers,
    });

    if (metaResponse.status === 401 || metaResponse.status === 403) {
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!metaResponse.ok) {
      const body = await metaResponse.text();
      this.logger.error(`Google Drive API error: ${metaResponse.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Google Drive API error: ${metaResponse.statusText}`,
        },
      };
    }

    const meta = (await metaResponse.json()) as { mimeType: string; name: string };
    const isGoogleDoc = meta.mimeType in GOOGLE_DOCS_EXPORT_DEFAULTS;

    let downloadResponse: Response;
    let resultMimeType: string;

    if (isGoogleDoc) {
      resultMimeType = args.exportMimeType || GOOGLE_DOCS_EXPORT_DEFAULTS[meta.mimeType];
      const params = new URLSearchParams({ mimeType: resultMimeType });
      downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${args.fileId}/export?${params.toString()}`,
        { headers },
      );
    } else {
      resultMimeType = args.exportMimeType || meta.mimeType;
      downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}?alt=media`, { headers });
    }

    if (downloadResponse.status === 401 || downloadResponse.status === 403) {
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!downloadResponse.ok) {
      const body = await downloadResponse.text();
      this.logger.error(`Google Drive download error: ${downloadResponse.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Google Drive API error: ${downloadResponse.statusText}`,
        },
      };
    }

    const isTextType = resultMimeType.startsWith('text/') || resultMimeType === 'application/json';

    if (isTextType) {
      const content = await downloadResponse.text();
      return {
        data: { content, mimeType: resultMimeType },
      };
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    return {
      data: {
        content: buffer.toString('base64'),
        mimeType: resultMimeType,
        encoding: 'base64',
      },
    };
  }
}

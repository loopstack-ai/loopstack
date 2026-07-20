import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    fileId: z.string(),
    exportMimeType: z.string().optional(),
  })
  .strict();

/**
 * Args for `GoogleDriveDownloadFileTool`.
 *
 * @public
 */
export type GoogleDriveDownloadFileArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GoogleDriveDownloadFileTool`.
 *
 * @public
 */
export type GoogleDriveDownloadFileResult =
  | { content: string; mimeType: string }
  | { content: string; mimeType: string; encoding: 'base64' }
  | { error: 'unauthorized'; message: string }
  | { error: 'api_error'; message: string };

const GOOGLE_DOCS_EXPORT_DEFAULTS: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
};

/**
 * Tool that downloads or exports a file from Google Drive. Takes a `fileId` and optional
 * `exportMimeType`, automatically handles Google Docs/Sheets/Slides export, and returns text or
 * base64-encoded content with its mime type, or `{ error: 'unauthorized' }` when no valid Google
 * token is available.
 *
 * @providedBy GoogleWorkspaceModule
 * @public
 */
@Tool({
  name: 'google_drive_download_file',
  description:
    'Downloads or exports a file from Google Drive. Automatically handles Google Docs/Sheets/Slides export. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GoogleDriveDownloadFileTool extends BaseTool<
  GoogleDriveDownloadFileArgs,
  object,
  GoogleDriveDownloadFileResult
> {
  private readonly logger = new Logger(GoogleDriveDownloadFileTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GoogleDriveDownloadFileArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleDriveDownloadFileResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
        error: 'No valid Google token found. Please authenticate first.',
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
        error: 'Google token was rejected. Please re-authenticate.',
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
        error: `Google Drive API error: ${metaResponse.statusText}`,
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
        error: 'Google token was rejected. Please re-authenticate.',
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
        error: `Google Drive API error: ${downloadResponse.statusText}`,
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

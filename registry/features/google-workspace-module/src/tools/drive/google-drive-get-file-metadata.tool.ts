import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    fileId: z.string(),
  })
  .strict();

/**
 * Args for `GoogleDriveGetFileMetadataTool`.
 *
 * @public
 */
export type GoogleDriveGetFileMetadataArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GoogleDriveGetFileMetadataTool`.
 *
 * @public
 */
export type GoogleDriveGetFileMetadataResult =
  | {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime: string;
      createdTime: string;
      owners?: Array<{ displayName: string; email: string }>;
      webViewLink?: string;
      parents?: string[];
      description?: string;
      shared?: boolean;
    }
  | { error: 'unauthorized'; message: string }
  | { error: 'api_error'; message: string };

/**
 * Tool that gets detailed metadata for a single Google Drive file. Takes a `fileId` and returns
 * name, mime type, size, timestamps, owners, parents, and sharing state, or
 * `{ error: 'unauthorized' }` when no valid Google token is available.
 *
 * @providedBy GoogleWorkspaceModule
 * @public
 */
@Tool({
  name: 'google_drive_get_file_metadata',
  description:
    'Gets detailed metadata for a single Google Drive file. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GoogleDriveGetFileMetadataTool extends BaseTool<
  GoogleDriveGetFileMetadataArgs,
  object,
  GoogleDriveGetFileMetadataResult
> {
  private readonly logger = new Logger(GoogleDriveGetFileMetadataTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GoogleDriveGetFileMetadataArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleDriveGetFileMetadataResult>> {
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
        error: 'Google token was rejected. Please re-authenticate.',
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
        error: `Google Drive API error: ${response.statusText}`,
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

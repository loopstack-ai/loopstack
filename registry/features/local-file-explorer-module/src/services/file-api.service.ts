import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { parse } from 'yaml';
import { getBlockConfig } from '@loopstack/common';
import { WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import type { FileContentDto } from '../dtos/file-content.dto';
import type { FileExplorerNodeDto } from '../dtos/file-explorer-node.dto';
import { FileSystemService } from './file-system.service';

@Injectable()
export class FileApiService {
  private readonly logger = new Logger(FileApiService.name);

  constructor(
    private fileSystemService: FileSystemService,
    private blockDiscoveryService: BlockDiscoveryService,
  ) {}

  /**
   * Get file tree for a workspace.
   */
  async getFileTree(workspaceClassName: string): Promise<FileExplorerNodeDto[]> {
    this.validateFileExplorerEnabled(workspaceClassName);

    const rootPath = this.fileSystemService.getWorkspaceRootPath();
    const exists = await this.fileSystemService.exists(rootPath);
    if (!exists) {
      this.logger.warn(`Workspace directory does not exist: ${rootPath}`);
      return [];
    }

    return this.fileSystemService.buildFileTree(rootPath);
  }

  /**
   * Get file content for a specific file in a workspace.
   */
  async getFileContent(workspaceClassName: string, filePath: string): Promise<FileContentDto> {
    this.validateFileExplorerEnabled(workspaceClassName);

    const rootPath = this.fileSystemService.getWorkspaceRootPath();
    const fullFilePath = path.join(rootPath, filePath);

    if (!this.fileSystemService.validatePath(rootPath, fullFilePath)) {
      throw new NotFoundException(`Invalid file path: ${filePath}`);
    }

    const exists = await this.fileSystemService.exists(fullFilePath);
    if (!exists) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const content = await this.fileSystemService.readFileContent(fullFilePath);
    if (content === null) {
      throw new NotFoundException(`Could not read file: ${filePath}`);
    }

    const result: FileContentDto = { path: filePath, content };

    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      try {
        const parsed: unknown = parse(content);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'transitions' in parsed &&
          Array.isArray((parsed as { transitions?: unknown }).transitions)
        ) {
          const config = parsed as {
            title?: string;
            description?: string;
            transitions: unknown[];
            ui?: unknown;
            schema?: unknown;
          };
          const alias = path.basename(filePath, path.extname(filePath));
          result.workflowConfig = {
            alias,
            title: config.title,
            description: config.description,
            transitions: config.transitions,
            ui: config.ui,
            schema: config.schema,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Failed to parse YAML file ${filePath} as workflow config: ${errorMessage}`);
      }
    }

    return result;
  }

  private validateFileExplorerEnabled(workspaceClassName: string): void {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceClassName);
    if (!workspace) {
      throw new NotFoundException(`Workspace with block name ${workspaceClassName} not found`);
    }

    const config = getBlockConfig<WorkspaceType>(workspace) as WorkspaceType;
    if (!config?.features?.fileExplorer?.enabled) {
      throw new BadRequestException(
        `File explorer is not enabled for workspace ${workspaceClassName}. Please enable it in the workspace config.`,
      );
    }
  }
}

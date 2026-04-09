import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { parse } from 'yaml';
import { WorkflowEntity, getBlockConfig } from '@loopstack/common';
import { WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { FileContentDto } from '../dtos/file-content.dto';
import { FileExplorerNodeDto } from '../dtos/file-tree.dto';
import { WorkflowConfigDto } from '../dtos/workflow-config.dto';
import { FileSystemService } from './file-system.service';

@Injectable()
export class FileApiService {
  private readonly logger = new Logger(FileApiService.name);

  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private fileSystemService: FileSystemService,
    private blockDiscoveryService: BlockDiscoveryService,
  ) {}

  /**
   * Get file tree for a workflow's workspace
   */
  async getFileTree(workflowId: string, userId: string): Promise<FileExplorerNodeDto[]> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id: workflowId,
        createdBy: userId,
      },
      relations: ['workspace'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    const volume = this.getFileExplorerVolume(workflow.workspace.className);
    this.validatePermission(volume.permissions, 'read', workflow.workspace.className, volume.volumeName);

    const exists = await this.fileSystemService.exists(volume.path);
    if (!exists) {
      this.logger.warn(`Workspace directory does not exist: ${volume.path}`);
      return [];
    }

    const tree = await this.fileSystemService.buildFileTree(volume.path);
    return tree;
  }

  /**
   * Get file content for a specific file in a workflow's workspace
   */
  async getFileContent(workflowId: string, filePath: string, userId: string): Promise<FileContentDto> {
    const workflow = await this.workflowRepository.findOne({
      where: {
        id: workflowId,
        createdBy: userId,
      },
      relations: ['workspace'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    const volume = this.getFileExplorerVolume(workflow.workspace.className);
    this.validatePermission(volume.permissions, 'read', workflow.workspace.className, volume.volumeName);

    const fullFilePath = path.join(volume.path, filePath);
    if (!this.fileSystemService.validatePath(volume.path, fullFilePath)) {
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

    const result: FileContentDto = {
      path: filePath,
      content,
    };

    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      try {
        const parsed: unknown = parse(content);
        const isWorkflowConfig = (
          obj: unknown,
        ): obj is {
          title?: string;
          description?: string;
          transitions: unknown[];
          ui?: unknown;
          schema?: unknown;
        } => {
          return (
            typeof obj === 'object' &&
            obj !== null &&
            'transitions' in obj &&
            Array.isArray((obj as { transitions?: unknown }).transitions)
          );
        };

        if (isWorkflowConfig(parsed)) {
          const alias = path.basename(filePath, path.extname(filePath));
          result.workflowConfig = {
            alias,
            title: parsed.title,
            description: parsed.description,
            transitions: parsed.transitions,
            ui: parsed.ui,
            schema: parsed.schema,
          } as WorkflowConfigDto;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Failed to parse YAML file ${filePath} as workflow config: ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * Get the file explorer volume info from workspace config
   */
  private getFileExplorerVolume(workspaceAlias: string): {
    path: string;
    permissions: ('read' | 'write')[];
    volumeName: string;
  } {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceAlias);
    if (!workspace) {
      throw new NotFoundException(`Workspace with block name ${workspaceAlias} not found`);
    }

    const config = getBlockConfig<WorkspaceType>(workspace) as WorkspaceType;
    if (!config) {
      throw new NotFoundException(`Workspace config for ${workspaceAlias} not found`);
    }

    if (!('features' in config) || !config.features) {
      throw new BadRequestException(
        `File explorer is not enabled for workspace ${workspaceAlias}. Please enable it in the workspace config.`,
      );
    }

    const fileExplorer = config.features.fileExplorer;
    if (!fileExplorer || fileExplorer.enabled !== true) {
      throw new BadRequestException(
        `File explorer is not enabled for workspace ${workspaceAlias}. Please enable it in the workspace config.`,
      );
    }

    return {
      path: 'deprecated',
      permissions: ['read', 'write'],
      volumeName: 'deprecated',
    };
  }

  /**
   * Validate that the volume has the required permission
   */
  private validatePermission(
    permissions: ('read' | 'write')[],
    requiredPermission: 'read' | 'write',
    workspaceAlias: string,
    volumeName: string,
  ): void {
    if (!permissions.includes(requiredPermission)) {
      throw new BadRequestException(
        `Volume '${volumeName}' does not have '${requiredPermission}' permission for workspace ${workspaceAlias}. Required permissions: ${requiredPermission}. Available permissions: ${permissions.join(', ')}.`,
      );
    }
  }
}

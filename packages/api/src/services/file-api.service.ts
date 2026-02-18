import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { parse } from 'yaml';
import { PipelineEntity, getBlockConfig } from '@loopstack/common';
import { WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { FileContentDto } from '../dtos/file-content.dto';
import { FileExplorerNodeDto } from '../dtos/file-tree.dto';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { FileSystemService } from './file-system.service';

@Injectable()
export class FileApiService {
  private readonly logger = new Logger(FileApiService.name);

  constructor(
    @InjectRepository(PipelineEntity)
    private pipelineRepository: Repository<PipelineEntity>,
    private fileSystemService: FileSystemService,
    private blockDiscoveryService: BlockDiscoveryService,
  ) {}

  /**
   * Get file tree for a pipeline's workspace
   */
  async getFileTree(pipelineId: string, userId: string): Promise<FileExplorerNodeDto[]> {
    const pipeline = await this.pipelineRepository.findOne({
      where: {
        id: pipelineId,
        createdBy: userId,
      },
      relations: ['workspace'],
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    const volume = this.getFileExplorerVolume(pipeline.workspace.blockName);
    this.validatePermission(volume.permissions, 'read', pipeline.workspace.blockName, volume.volumeName);

    const exists = await this.fileSystemService.exists(volume.path);
    if (!exists) {
      this.logger.warn(`Workspace directory does not exist: ${volume.path}`);
      return [];
    }

    const tree = await this.fileSystemService.buildFileTree(volume.path);
    return tree;
  }

  /**
   * Get file content for a specific file in a pipeline's workspace
   */
  async getFileContent(pipelineId: string, filePath: string, userId: string): Promise<FileContentDto> {
    const pipeline = await this.pipelineRepository.findOne({
      where: {
        id: pipelineId,
        createdBy: userId,
      },
      relations: ['workspace'],
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    const volume = this.getFileExplorerVolume(pipeline.workspace.blockName);
    this.validatePermission(volume.permissions, 'read', pipeline.workspace.blockName, volume.volumeName);

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
          const blockName = path.basename(filePath, path.extname(filePath));
          result.workflowConfig = {
            blockName,
            title: parsed.title,
            description: parsed.description,
            transitions: parsed.transitions,
            ui: parsed.ui,
            schema: parsed.schema,
          } as PipelineConfigDto;
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
  private getFileExplorerVolume(workspaceBlockName: string): {
    path: string;
    permissions: ('read' | 'write')[];
    volumeName: string;
  } {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceBlockName);
    if (!workspace) {
      throw new NotFoundException(`Workspace with block name ${workspaceBlockName} not found`);
    }

    const config = getBlockConfig<WorkspaceType>(workspace) as WorkspaceType;
    if (!config) {
      throw new NotFoundException(`Workspace config for ${workspaceBlockName} not found`);
    }

    if (!('features' in config) || !config.features) {
      throw new BadRequestException(
        `File explorer is not enabled for workspace ${workspaceBlockName}. Please enable it in the workspace config.`,
      );
    }

    const fileExplorer = config.features.fileExplorer;
    if (!fileExplorer || fileExplorer.enabled !== true) {
      throw new BadRequestException(
        `File explorer is not enabled for workspace ${workspaceBlockName}. Please enable it in the workspace config.`,
      );
    }

    const volumeName = fileExplorer.volume ?? 'default';

    if (!('volumes' in config) || !config.volumes) {
      throw new BadRequestException(
        `Volumes are not configured for workspace ${workspaceBlockName}. Please configure volumes in the workspace config.`,
      );
    }

    const volumes = config.volumes;
    if (!volumes[volumeName]) {
      throw new BadRequestException(
        `Volume '${volumeName}' is not configured for workspace ${workspaceBlockName}. Please configure it in the workspace config.`,
      );
    }

    const volume = volumes[volumeName];
    if (!volume || !volume.path) {
      throw new BadRequestException(
        `Volume '${volumeName}' does not have a path configured for workspace ${workspaceBlockName}.`,
      );
    }

    if (!volume.permissions || !Array.isArray(volume.permissions) || volume.permissions.length === 0) {
      throw new BadRequestException(
        `Volume '${volumeName}' does not have permissions configured for workspace ${workspaceBlockName}.`,
      );
    }

    return {
      path: volume.path,
      permissions: volume.permissions,
      volumeName,
    };
  }

  /**
   * Validate that the volume has the required permission
   */
  private validatePermission(
    permissions: ('read' | 'write')[],
    requiredPermission: 'read' | 'write',
    workspaceBlockName: string,
    volumeName: string,
  ): void {
    if (!permissions.includes(requiredPermission)) {
      throw new BadRequestException(
        `Volume '${volumeName}' does not have '${requiredPermission}' permission for workspace ${workspaceBlockName}. Required permissions: ${requiredPermission}. Available permissions: ${permissions.join(', ')}.`,
      );
    }
  }
}

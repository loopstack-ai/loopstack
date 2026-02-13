import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { parse } from 'yaml';
import { PipelineEntity } from '@loopstack/common';
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

    const workspaceRootPath = this.fileSystemService.getWorkspaceRootPath(pipeline.workspaceId);

    const exists = await this.fileSystemService.exists(workspaceRootPath);
    if (!exists) {
      this.logger.warn(`Workspace directory does not exist: ${workspaceRootPath}`);
      return [];
    }

    const tree = await this.fileSystemService.buildFileTree(workspaceRootPath);
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

    const workspaceRootPath = this.fileSystemService.getWorkspaceRootPath(pipeline.workspaceId);

    const fullFilePath = path.join(workspaceRootPath, filePath);
    if (!this.fileSystemService.validatePath(workspaceRootPath, fullFilePath)) {
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
}

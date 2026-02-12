import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { PipelineEntity } from '@loopstack/common';
import { FileContentDto } from '../dtos/file-content.dto';
import { FileExplorerNodeDto } from '../dtos/file-tree.dto';
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

    return {
      path: filePath,
      content,
    };
  }
}

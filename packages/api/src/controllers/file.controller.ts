import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { FileContentDto } from '../dtos/file-content.dto';
import { FileExplorerNodeDto } from '../dtos/file-tree.dto';
import { FileApiService } from '../services/file-api.service';

@ApiTags('api/v1/workflows')
@ApiExtraModels(FileExplorerNodeDto, FileContentDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workflows')
export class FileController {
  constructor(private readonly fileApiService: FileApiService) {}

  /**
   * Get file tree for a workflow's workspace
   */
  @Get(':workflowId/files')
  @ApiOperation({
    summary: 'Get file tree for a workflow',
    description: "Returns the file tree structure of files in the workflow's workspace directory",
  })
  @ApiParam({
    name: 'workflowId',
    type: String,
    description: 'The unique identifier of the workflow',
    required: true,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'File tree retrieved successfully',
    type: [FileExplorerNodeDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found',
  })
  @ApiUnauthorizedResponse()
  async getFileTree(
    @Param('workflowId') workflowId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileExplorerNodeDto[]> {
    return this.fileApiService.getFileTree(workflowId, user.userId);
  }

  /**
   * Get file content for a specific file
   * Note: This route must be registered after the file tree route to avoid conflicts
   */
  @Get(':workflowId/files/*filePath')
  @ApiOperation({
    summary: 'Get file content',
    description: "Returns the content of a specific file in the workflow's workspace",
  })
  @ApiParam({
    name: 'workflowId',
    type: String,
    description: 'The unique identifier of the workflow',
    required: true,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'filePath',
    type: String,
    description: 'File path relative to workspace root (URL encoded, supports nested paths)',
    required: true,
    example: 'src/components/Button.tsx',
  })
  @ApiOkResponse({
    description: 'File content retrieved successfully',
    type: FileContentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow or file not found',
  })
  @ApiUnauthorizedResponse()
  async getFileContent(
    @Param('workflowId') workflowId: string,
    @Param('filePath') filePath: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileContentDto> {
    const decodedPath = decodeURIComponent(filePath);
    return this.fileApiService.getFileContent(workflowId, decodedPath, user.userId);
  }
}

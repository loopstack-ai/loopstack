import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class VolumeDto {
  @Expose()
  @ApiProperty({
    description: 'Path of the volume',
    example: '/workspace/files',
  })
  path: string;

  @Expose()
  @ApiProperty({
    description: 'Permissions for the volume',
    example: ['read', 'write'],
    type: [String],
    enum: ['read', 'write'],
  })
  permissions: ('read' | 'write')[];
}

export class SidebarFeatureDto {
  @Expose()
  @ApiPropertyOptional({
    description: 'Whether the sidebar feature is enabled',
    example: true,
    default: true,
  })
  enabled?: boolean;
}

export class FileExplorerFeatureDto {
  @Expose()
  @ApiPropertyOptional({
    description: 'Whether the file explorer feature is enabled',
    example: true,
    default: true,
  })
  enabled?: boolean;

  @Expose()
  @ApiPropertyOptional({
    description: 'Volume name to use for file explorer',
    example: 'default',
  })
  volume?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Additional options for file explorer',
    example: {},
  })
  options?: Record<string, unknown>;
}

export class FeaturesDto {
  @Expose()
  @Type(() => SidebarFeatureDto)
  @ApiPropertyOptional({
    description: 'Sidebar feature configuration',
    type: SidebarFeatureDto,
  })
  sidebar?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  @ApiPropertyOptional({
    description: 'Workflow history feature configuration',
    type: SidebarFeatureDto,
  })
  workflowHistory?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  @ApiPropertyOptional({
    description: 'Workflow navigation feature configuration',
    type: SidebarFeatureDto,
  })
  workflowNavigation?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  @ApiPropertyOptional({
    description: 'Debug workflow feature configuration',
    type: SidebarFeatureDto,
  })
  debugWorkflow?: SidebarFeatureDto;

  @Expose()
  @Type(() => FileExplorerFeatureDto)
  @ApiPropertyOptional({
    description: 'File explorer feature configuration',
    type: FileExplorerFeatureDto,
  })
  fileExplorer?: FileExplorerFeatureDto;
}

export class WorkspaceConfigDto {
  /**
   * Config Key of the workspace
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the workspace',
    example: 'file.yaml:my-workspace',
  })
  blockName: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'The title of the workspace type',
    example: 'My Workspace',
  })
  title?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Volumes configuration',
    type: 'object',
    additionalProperties: true,
  })
  volumes?: Record<string, VolumeDto>;

  @Expose()
  @Type(() => FeaturesDto)
  @ApiPropertyOptional({
    description: 'Features configuration',
    type: FeaturesDto,
  })
  features?: FeaturesDto;
}

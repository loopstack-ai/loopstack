import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import type {
  EnvironmentConfigInterface,
  FeaturesInterface,
  FileExplorerFeatureInterface,
  FlyInstanceFeatureInterface,
  SidebarFeatureInterface,
  VolumeInterface,
  WorkspaceActionInterface,
  WorkspaceConfigInterface,
  WorkspaceUiInterface,
} from '@loopstack/contracts/api';

export class VolumeDto implements VolumeInterface {
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

export class SidebarFeatureDto implements SidebarFeatureInterface {
  @Expose()
  @ApiPropertyOptional({
    description: 'Whether the sidebar feature is enabled',
    example: true,
    default: true,
  })
  enabled?: boolean;
}

export class FileExplorerFeatureDto implements FileExplorerFeatureInterface {
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

export class FlyInstanceFeatureDto implements FlyInstanceFeatureInterface {
  @Expose()
  @ApiPropertyOptional({
    description: 'Whether the fly instance feature is enabled',
    example: false,
    default: false,
  })
  enabled?: boolean;
}

export class EnvironmentConfigDto implements EnvironmentConfigInterface {
  @Expose()
  @ApiProperty({
    description: 'Logical identifier for this environment slot',
    example: 'primary',
  })
  id: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Display title for this environment slot',
    example: 'Primary Environment',
  })
  title?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Environment type that this slot requires (e.g. sandbox, production)',
    example: 'sandbox',
  })
  type?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Whether this environment slot is optional',
    example: false,
  })
  optional?: boolean;
}

export class FeaturesDto implements FeaturesInterface {
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

  @Expose()
  @Type(() => FlyInstanceFeatureDto)
  @ApiPropertyOptional({
    description: 'Fly instance feature configuration',
    type: FlyInstanceFeatureDto,
  })
  flyInstance?: FlyInstanceFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  @ApiPropertyOptional({
    description: 'Preview panel feature configuration',
    type: SidebarFeatureDto,
  })
  previewPanel?: SidebarFeatureDto;
}

export class WorkspaceActionDto implements WorkspaceActionInterface {
  @Expose()
  @ApiProperty({
    description: 'Widget type for this action',
    example: 'start-form',
  })
  widget: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Options for this action widget',
  })
  options?: Record<string, any>;
}

export class WorkspaceUiDto implements WorkspaceUiInterface {
  @Expose()
  @Type(() => WorkspaceActionDto)
  @ApiPropertyOptional({
    description: 'UI widgets for this workspace',
    type: WorkspaceActionDto,
    isArray: true,
  })
  widgets?: WorkspaceActionDto[];
}

export class WorkspaceConfigDto implements WorkspaceConfigInterface {
  /**
   * Config Key of the workspace
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the workspace',
    example: 'file.yaml:my-workspace',
  })
  className: string;

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

  @Expose()
  @Type(() => EnvironmentConfigDto)
  @ApiPropertyOptional({
    description: 'Required environment slots for this workspace',
    type: EnvironmentConfigDto,
    isArray: true,
  })
  environments?: EnvironmentConfigDto[];

  @Expose()
  @Type(() => WorkspaceUiDto)
  @ApiPropertyOptional({
    description: 'UI configuration for this workspace',
    type: WorkspaceUiDto,
  })
  ui?: WorkspaceUiDto;
}

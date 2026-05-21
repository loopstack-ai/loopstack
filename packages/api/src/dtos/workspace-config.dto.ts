import { Expose, Type } from 'class-transformer';
import type {
  AppConfigInterface,
  EnvironmentConfigInterface,
  FeaturesInterface,
  FileExplorerFeatureInterface,
  FlyInstanceFeatureInterface,
  SidebarFeatureInterface,
  VolumeInterface,
  WorkspaceActionInterface,
  WorkspaceUiInterface,
} from '@loopstack/contracts/api';

export class VolumeDto implements VolumeInterface {
  @Expose()
  path: string;

  @Expose()
  permissions: ('read' | 'write')[];
}

export class SidebarFeatureDto implements SidebarFeatureInterface {
  @Expose()
  enabled?: boolean;
}

export class FileExplorerFeatureDto implements FileExplorerFeatureInterface {
  @Expose()
  enabled?: boolean;

  @Expose()
  volume?: string;

  @Expose()
  options?: Record<string, unknown>;
}

export class FlyInstanceFeatureDto implements FlyInstanceFeatureInterface {
  @Expose()
  enabled?: boolean;
}

export class EnvironmentConfigDto implements EnvironmentConfigInterface {
  @Expose()
  id: string;

  @Expose()
  title?: string;

  @Expose()
  type?: string;

  @Expose()
  optional?: boolean;
}

export class FeaturesDto implements FeaturesInterface {
  @Expose()
  @Type(() => SidebarFeatureDto)
  sidebar?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  workflowHistory?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  workflowNavigation?: SidebarFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  debugWorkflow?: SidebarFeatureDto;

  @Expose()
  @Type(() => FileExplorerFeatureDto)
  fileExplorer?: FileExplorerFeatureDto;

  @Expose()
  @Type(() => FlyInstanceFeatureDto)
  flyInstance?: FlyInstanceFeatureDto;

  @Expose()
  @Type(() => SidebarFeatureDto)
  previewPanel?: SidebarFeatureDto;
}

export class WorkspaceActionDto implements WorkspaceActionInterface {
  @Expose()
  widget: string;

  @Expose()
  options?: Record<string, any>;
}

export class WorkspaceUiDto implements WorkspaceUiInterface {
  @Expose()
  @Type(() => WorkspaceActionDto)
  widgets?: WorkspaceActionDto[];
}

export class AppConfigDto implements AppConfigInterface {
  /**
   * Config Key of the app
   */
  @Expose()
  className: string;

  @Expose()
  title?: string;

  @Expose()
  volumes?: Record<string, VolumeDto>;

  @Expose()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  @Expose()
  @Type(() => EnvironmentConfigDto)
  environments?: EnvironmentConfigDto[];

  @Expose()
  @Type(() => WorkspaceUiDto)
  ui?: WorkspaceUiDto;
}

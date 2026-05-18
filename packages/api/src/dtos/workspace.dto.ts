import { Expose, Type, plainToInstance } from 'class-transformer';
import { WorkspaceEntity } from '@loopstack/common';
import { FeaturesDto, VolumeDto } from './workspace-config.dto';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto';

/**
 * Data Transfer Object for Workspace entity
 */
export class WorkspaceDto {
  /**
   * Unique identifier of the workspace
   */
  @Expose()
  id: string;

  /**
   * Config Key of the workspace
   */
  @Expose()
  className: string;

  @Expose()
  title: string;

  /**
   * Indicates whether the workspace is locked for editing
   */
  @Expose()
  isLocked: boolean;

  @Expose()
  isFavourite: boolean;

  /**
   * Timestamp when the workspace was created
   */
  @Expose()
  createdAt: Date;

  /**
   * Timestamp when the workspace was last updated
   */
  @Expose()
  updatedAt: Date;

  @Expose()
  volumes?: Record<string, VolumeDto>;

  @Expose()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  @Expose()
  @Type(() => WorkspaceEnvironmentDto)
  environments?: WorkspaceEnvironmentDto[];

  /**
   * Creates a WorkspaceDto instance from a WorkspaceEntity
   * @param workspace - The workspace entity to transform
   * @returns A new WorkspaceDto instance
   */
  static create(workspace: WorkspaceEntity): WorkspaceDto {
    return plainToInstance(WorkspaceDto, workspace, {
      excludeExtraneousValues: true,
    });
  }
}

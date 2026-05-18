import { Expose, Type, plainToInstance } from 'class-transformer';
import { WorkspaceEntity } from '@loopstack/common';
import { WorkspaceEnvironmentDto } from './workspace-environment.dto';

/**
 * Data Transfer Object for Workspace Item
 */
export class WorkspaceItemDto {
  /**
   * Unique identifier of the workspace item
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

  @Expose()
  isFavourite: boolean;

  /**
   * Timestamp when the workspace item was created
   */
  @Expose()
  createdAt: Date;

  /**
   * Timestamp when the workspace item was last updated
   */
  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => WorkspaceEnvironmentDto)
  environments?: WorkspaceEnvironmentDto[];

  /**
   * Creates a WorkspaceItemDto instance from a WorkspaceEntity
   * @param workspace - The workspace entity to transform
   * @returns A new WorkspaceItemDto instance
   */
  static create(workspace: WorkspaceEntity): WorkspaceItemDto {
    return plainToInstance(WorkspaceItemDto, workspace, {
      excludeExtraneousValues: true,
    });
  }
}

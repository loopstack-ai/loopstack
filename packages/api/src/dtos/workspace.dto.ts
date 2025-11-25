import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceEntity } from '@loopstack/common';

/**
 * Data Transfer Object for Workspace entity
 */
export class WorkspaceDto {
  /**
   * Unique identifier of the workspace
   */
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  /**
   * Config Key of the workspace
   */
  @Expose()
  @ApiProperty({
    description: 'Config key of the workspace',
    example: 'file.yaml:my-workspace',
  })
  configKey: string;

  @Expose()
  @ApiProperty({
    description: 'Display title of the workspace',
    example: 'Customer Portal',
  })
  title: string;

  /**
   * Indicates whether the workspace is locked for editing
   */
  @Expose()
  @ApiProperty({
    description: 'Indicates whether the workspace is locked for editing',
    example: false,
  })
  isLocked: boolean;

  /**
   * Timestamp when the workspace was created
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the workspace was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  /**
   * Timestamp when the workspace was last updated
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the workspace was last updated',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;

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

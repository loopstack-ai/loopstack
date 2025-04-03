import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceEntity } from '@loopstack/shared';

/**
 * Data Transfer Object for Workspace Item
 */
export class WorkspaceItemDto {
  /**
   * Unique identifier of the workspace item
   */
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workspace item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Display title of the workspace',
    example: 'Customer Portal',
  })
  title: string;

  /**
   * Timestamp when the workspace item was created
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the workspace item was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  /**
   * Timestamp when the workspace item was last updated
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Timestamp when the workspace item was last updated',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;

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

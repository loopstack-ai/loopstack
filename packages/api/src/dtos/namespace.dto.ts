import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { NamespaceEntity } from '@loopstack/common';

/**
 * Data Transfer Object representing a namespace
 */
export class NamespaceDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the namespace',
    example: '5f8d3a9b-8b5c-4b9e-8c1a-3d9c8e6f7a2b',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Name of the namespace',
    example: 'Feature123',
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the workspace this namespace belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  workspaceId: string;

  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the pipeline this namespace belongs to',
    example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t',
  })
  pipelineId: string;

  @Expose()
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Metadata of this namespace',
    example: '{ "label": "My namespace 1" }',
  })
  metadata: Record<string, any> | null;

  @Expose()
  @ApiProperty({
    description: 'Parent namespace ID',
    type: 'string',
    nullable: true,
  })
  parentId: string | null;

  /**
   * Creates a NamespaceDto instance from a NamespaceEntity
   */
  static create(namespace: NamespaceEntity): NamespaceDto {
    return plainToInstance(NamespaceDto, namespace, {
      // excludeExtraneousValues: true,
    });
  }
}

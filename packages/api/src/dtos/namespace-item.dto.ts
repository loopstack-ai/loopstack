import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { NamespaceEntity } from '@loopstack/common';

/**
 * Data Transfer Object representing a namespace
 */
export class NamespaceItemDto {
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
   * Creates a NamespaceItemDto instance from a NamespaceEntity
   */
  static create(namespace: NamespaceEntity): NamespaceItemDto {
    return plainToInstance(NamespaceItemDto, namespace, {
      excludeExtraneousValues: true,
    });
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AdminUserAssignRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  @ApiProperty({
    description: 'Array of role UUIDs to assign to the user (replaces existing roles)',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  roleIds: string[];
}

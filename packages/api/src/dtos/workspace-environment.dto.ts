import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { WorkspaceEnvironmentEntity } from '@loopstack/common';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';

export class WorkspaceEnvironmentDto implements WorkspaceEnvironmentInterface {
  @Expose()
  @IsString()
  @ApiProperty({ description: 'Logical slot identifier from workspace config', example: 'primary' })
  slotId: string;

  @Expose()
  @IsString()
  @ApiProperty({ description: 'Environment type (e.g., sandbox, production)', example: 'sandbox' })
  type: string;

  @Expose()
  @IsString()
  @ApiProperty({
    description: 'Remote environment ID from hub-backend',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  remoteEnvironmentId: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Environment display name', example: 'my-app-xyz' })
  envName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Connection URL for the environment', example: 'https://my-app-xyz.fly.dev' })
  connectionUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Agent URL for the environment', example: 'https://my-app-xyz.fly.dev/agent' })
  agentUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Worker ID associated with this environment' })
  workerId?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Worker URL for this environment' })
  workerUrl?: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Whether this is a locally defined environment' })
  local?: boolean;

  static create(entity: WorkspaceEnvironmentEntity): WorkspaceEnvironmentDto {
    return plainToInstance(WorkspaceEnvironmentDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}

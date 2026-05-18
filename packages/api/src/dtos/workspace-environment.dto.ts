import { Expose, plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { WorkspaceEnvironmentEntity } from '@loopstack/common';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';

export class WorkspaceEnvironmentDto implements WorkspaceEnvironmentInterface {
  @Expose()
  @IsString()
  slotId: string;

  @Expose()
  @IsString()
  type: string;

  @Expose()
  @IsString()
  remoteEnvironmentId: string;

  @Expose()
  @IsOptional()
  @IsString()
  envName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  connectionUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  agentUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  workerId?: string;

  @Expose()
  @IsOptional()
  @IsString()
  workerUrl?: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  local?: boolean;

  static create(entity: WorkspaceEnvironmentEntity): WorkspaceEnvironmentDto {
    return plainToInstance(WorkspaceEnvironmentDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}

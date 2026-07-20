import { Expose, plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import { WorkspaceEnvironmentEntity } from '../entities/index.js';

/**
 * Result representing a persisted workspace environment — slot, type, remote environment id, and the
 * connection and agent URLs used to reach it.
 *
 * @public
 */
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

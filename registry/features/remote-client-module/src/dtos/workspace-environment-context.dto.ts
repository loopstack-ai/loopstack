import { Expose, plainToInstance } from 'class-transformer';
import { WorkspaceEnvironmentEntity } from '../entities/index.js';

/**
 * Result describing a workspace environment in execution context — slot, type, and the resolved
 * connection and agent URLs returned by `EnvironmentService`.
 *
 * @public
 */
export class WorkspaceEnvironmentContextDto {
  @Expose()
  slotId: string;

  @Expose()
  type: string;

  @Expose()
  envName?: string;

  @Expose()
  connectionUrl?: string;

  @Expose()
  agentUrl?: string;

  @Expose()
  workerId?: string;

  @Expose()
  workerUrl?: string;

  static fromEntities(entities: WorkspaceEnvironmentEntity[]): WorkspaceEnvironmentContextDto[] {
    return entities.map((entity) =>
      plainToInstance(WorkspaceEnvironmentContextDto, entity, {
        excludeExtraneousValues: true,
      }),
    );
  }
}

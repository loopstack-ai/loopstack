import { Expose, plainToInstance } from 'class-transformer';
import { WorkspaceEnvironmentEntity } from '../entities';

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

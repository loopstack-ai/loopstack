import { Expose } from 'class-transformer';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';

export class AvailableEnvironmentDto implements AvailableEnvironmentInterface {
  @Expose()
  type: string;

  @Expose()
  name: string;

  @Expose()
  connectionUrl: string;

  @Expose()
  agentUrl?: string;

  @Expose()
  local?: boolean;
}

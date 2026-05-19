import { Expose } from 'class-transformer';
import type { WorkerInfoInterface } from '@loopstack/contracts/api';

export class WorkerInfoDto implements WorkerInfoInterface {
  @Expose()
  clientId?: string;

  @Expose()
  isConfigured: boolean;

  @Expose()
  timestamp: string;
}

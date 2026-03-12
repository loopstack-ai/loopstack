import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { WorkerInfoInterface } from '@loopstack/contracts/api';

export class WorkerInfoDto implements WorkerInfoInterface {
  @Expose()
  @ApiPropertyOptional({
    description: 'Worker Client ID',
  })
  clientId?: string;

  @Expose()
  @ApiProperty({
    description: 'Is worker configured.',
  })
  isConfigured: boolean;

  @Expose()
  @ApiProperty({
    description: 'Current Timestamp.',
  })
  timestamp: string;
}

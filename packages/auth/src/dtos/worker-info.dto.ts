import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WorkerInfoDto {
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

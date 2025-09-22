import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
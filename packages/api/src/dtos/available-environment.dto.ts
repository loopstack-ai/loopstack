import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';

export class AvailableEnvironmentDto implements AvailableEnvironmentInterface {
  @Expose()
  @ApiProperty({ description: 'Environment type (e.g. sandbox, production)' })
  type: string;

  @Expose()
  @ApiProperty({ description: 'Display name for this environment' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'URL to connect to this environment' })
  connectionUrl: string;

  @Expose()
  @ApiPropertyOptional({ description: 'URL for the agent endpoint' })
  agentUrl?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Whether this is a locally defined environment' })
  local?: boolean;
}

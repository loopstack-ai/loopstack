import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { HubLoginRequestInterface } from '@loopstack/contracts/api';

export class HubLoginRequestDto implements HubLoginRequestInterface {
  @Expose()
  @ApiProperty({ description: 'Hub-signed ID token' })
  idToken: string;
}

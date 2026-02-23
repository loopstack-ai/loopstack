import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class HubLoginRequestDto {
  @Expose()
  @ApiProperty({ description: 'Hub-signed ID token' })
  idToken: string;
}

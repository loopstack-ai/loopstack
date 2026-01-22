import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class HubLoginRequestDto {
  @Expose()
  @ApiProperty({ description: 'The authorization code' })
  code: string;

  @Expose()
  @ApiProperty({ description: 'The grant type', example: 'authorization_code' })
  grantType: string;
}

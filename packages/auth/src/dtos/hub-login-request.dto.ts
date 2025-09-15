import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class HubLoginRequestDto {
  @Expose()
  @ApiProperty({ description: 'The user ID' })
  userId: string;

  @Expose()
  @ApiProperty({ description: 'The authorization code' })
  code: string;

  @Expose()
  @ApiProperty({ description: 'The grant type', example: 'authorization_code' })
  grantType: string;
}
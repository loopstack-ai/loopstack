import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class HubLoginResponseDto {
  @Expose()
  @ApiProperty({ description: 'The logged in user id' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'A message' })
  message: string;
}
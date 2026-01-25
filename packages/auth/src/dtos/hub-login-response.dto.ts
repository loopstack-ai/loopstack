import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class HubLoginResponseDto {
  @Expose()
  @ApiProperty({ description: 'The logged in user id' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'A message' })
  message: string;
}

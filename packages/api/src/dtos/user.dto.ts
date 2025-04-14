import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserDto {
  @ApiProperty({
    description: 'Unique identifier for the user.',
  })
  @Expose()
  id: string | null;

  constructor(id: string | null = null) {
    this.id = id;
  }
}

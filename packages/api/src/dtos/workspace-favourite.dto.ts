import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class WorkspaceFavouriteDto {
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the workspace should be marked as favourite',
    example: true,
  })
  isFavourite: boolean;
}

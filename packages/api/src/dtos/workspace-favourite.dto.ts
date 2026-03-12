import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import type { WorkspaceFavouriteInterface } from '@loopstack/contracts/api';

export class WorkspaceFavouriteDto implements WorkspaceFavouriteInterface {
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the workspace should be marked as favourite',
    example: true,
  })
  isFavourite: boolean;
}

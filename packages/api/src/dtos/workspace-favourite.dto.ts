import { IsBoolean } from 'class-validator';
import type { WorkspaceFavouriteInterface } from '@loopstack/contracts/api';

export class WorkspaceFavouriteDto implements WorkspaceFavouriteInterface {
  @IsBoolean()
  isFavourite: boolean;
}

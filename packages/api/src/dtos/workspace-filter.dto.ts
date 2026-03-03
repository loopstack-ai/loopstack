import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class WorkspaceFilterDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as unknown;
  })
  isFavourite?: boolean;
}

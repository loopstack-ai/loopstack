import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserTypeEnum } from '@loopstack/common';

export class AdminUserFilterDto {
  @IsOptional()
  @IsEnum(UserTypeEnum)
  @ApiPropertyOptional({ enum: UserTypeEnum })
  type?: UserTypeEnum;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @ApiPropertyOptional()
  isActive?: boolean;
}

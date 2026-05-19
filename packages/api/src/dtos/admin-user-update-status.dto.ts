import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AdminUserUpdateStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

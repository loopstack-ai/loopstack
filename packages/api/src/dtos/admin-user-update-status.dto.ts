import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AdminUserUpdateStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Whether the user account should be active',
    example: false,
  })
  isActive: boolean;
}

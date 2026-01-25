import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DocumentFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workflowId?: string;
}

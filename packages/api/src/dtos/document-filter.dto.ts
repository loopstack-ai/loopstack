import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional} from "@nestjs/swagger";

export class DocumentFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workflowId?: string;
}

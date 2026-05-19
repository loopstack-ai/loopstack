import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for workflow callback payload
 */
export class CallbackWorkflowPayloadDto {
  @IsString()
  transition: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

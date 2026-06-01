import { Expose } from 'class-transformer';
import type { ToolConfigInterface } from '@loopstack/contracts/api';
import type { UiFormType } from '@loopstack/contracts/types';

export class ToolConfigDto implements ToolConfigInterface {
  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  ui?: UiFormType;
}

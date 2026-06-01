import type { UiFormType } from '../types/index.js';

export interface ToolConfigInterface {
  name: string;
  description?: string;
  ui?: UiFormType;
}

import { ContentTypesType } from '@loopstack/shared';

export interface DocumentCreateInterface {
  name: string;
  type: string;
  contents: any;
  contentType: ContentTypesType;
  schema?: any;
  uiOptions?: any;
  meta?: Record<string, any> | null;
  transition?: string;
}
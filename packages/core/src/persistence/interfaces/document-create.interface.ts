export interface DocumentCreateInterface {
  name: string;
  type: string;
  contents: any;
  schema?: any;
  uiOptions?: any;
  meta?: Record<string, any> | null;
  transition?: string;
}
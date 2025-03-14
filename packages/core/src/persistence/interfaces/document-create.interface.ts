export interface DocumentCreateInterface {
  name: string;
  type: string;
  contents: any;
  schema?: any;
  uiSchema?: any;
  meta?: Record<string, any> | null;
  transition?: string;
}
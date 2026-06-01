// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DocumentClass<T = any> = Function & { new (...args: any[]): T; prototype: T };

export interface DocumentSaveOptions {
  id?: string;
  meta?: Record<string, unknown>;
  validate?: 'strict' | 'safe' | 'skip';
}

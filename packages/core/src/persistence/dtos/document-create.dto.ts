export class DocumentCreateDto<T = any> {
  name: string;
  type: string;
  contents: T | null;
  isJsonSerialized?: boolean;
  meta?: Record<string, any> | null;

  constructor(data: Partial<DocumentCreateDto>) {
    Object.assign(this, data);
  }
}

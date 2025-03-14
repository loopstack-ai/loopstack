import { ZodType } from 'zod';

export interface AdapterInterface {
  propsSchema: ZodType | undefined;
  execute: (props: any, context?: any) => Promise<any>;
}

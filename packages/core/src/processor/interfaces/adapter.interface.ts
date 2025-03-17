import { ServiceWithSchemaInterface } from './service-with-schema.interface';

export interface AdapterInterface extends ServiceWithSchemaInterface {
  execute: (props: any, context?: any) => Promise<any>;
}

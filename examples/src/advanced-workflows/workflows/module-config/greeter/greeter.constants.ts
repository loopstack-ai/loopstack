export const GREETER_CONFIG = Symbol('GREETER_CONFIG');

export interface GreeterConfig {
  language?: string;
  greeting?: string;
}

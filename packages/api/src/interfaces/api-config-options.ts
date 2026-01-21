import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export interface LoopstackApiConfigPluginOptions {
  swagger?: {
    enabled?: boolean;
    config?: Omit<OpenAPIObject, 'paths'>;
  };
  cors?: {
    enabled?: boolean;
    options?: CorsOptions;
  };
}

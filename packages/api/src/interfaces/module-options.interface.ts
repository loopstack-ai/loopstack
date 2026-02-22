import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces';

export interface ModuleOptionsInterface {
  swagger?: {
    enabled?: boolean;
    config?: Omit<OpenAPIObject, 'paths'>;
  };
  cors?: {
    enabled?: boolean;
    options?: CorsOptions;
  };
}

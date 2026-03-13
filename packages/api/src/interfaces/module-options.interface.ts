import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';

export interface ModuleOptionsInterface {
  swagger?: {
    enabled?: boolean;
    config?: Omit<OpenAPIObject, 'paths'>;
  };
  cors?: {
    enabled?: boolean;
    options?: CorsOptions;
  };
  availableEnvironments?: AvailableEnvironmentInterface[];
}

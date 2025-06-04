import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';

@Injectable()
export class ToolSchemaValidatorService {
  private logger = new Logger(ToolSchemaValidatorService.name);

  validateProps(schema: ZodSchema | undefined, props: any) {
    if (schema) {
      try {
        return schema.parse(props);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const enhancedErrors = error.errors.map((err) => {
            const path = err.path;

            // Extract the invalid value from your original data using the path
            const invalidValue = path.reduce(
              (obj, key) =>
                obj && typeof obj === 'object' ? obj[key] : undefined,
              props,
            );

            return {
              ...err,
              invalidValue,
            };
          });

          this.logger.error(JSON.stringify(enhancedErrors, null, 2));
        }
        throw error;
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

@Injectable()
export class ZodGeneratorService {
  public createZod(jsonSchema: any): z.ZodType {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    return new Function('z', `return ${zodSchemaString}`)(z);
  }
}

import { z } from 'zod';
import { UiElementSchema } from './ui-form-element.schema';

export const UiPropertiesSchema: z.ZodType<any> = z.lazy(() =>
    UiElementSchema.extend({
      items: z.union([UiPropertiesSchema, z.array(UiPropertiesSchema)]).optional(),
      properties: z.record(UiPropertiesSchema).optional(),
    })
);


import { z } from 'zod';
import { JSONSchemaType } from '../../schemas';

export type JSONSchemaConfigType = z.infer<typeof JSONSchemaType>;

import { z } from 'zod';
import { JSONSchemaType } from '../../schemas/index.js';

export type JSONSchemaConfigType = z.infer<typeof JSONSchemaType>;

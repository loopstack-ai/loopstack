import { z } from 'zod';
import { JSONSchemaType } from '../../schemas';

export interface JSONSchemaConfigType extends z.infer<typeof JSONSchemaType> {}
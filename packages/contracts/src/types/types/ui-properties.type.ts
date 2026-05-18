import { z } from 'zod';
import { UiPropertiesSchema } from '../../schemas/index.js';

export type UiPropertiesType = z.infer<typeof UiPropertiesSchema>;

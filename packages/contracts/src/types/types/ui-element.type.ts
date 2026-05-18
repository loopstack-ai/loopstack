import { z } from 'zod';
import { UiElementSchema } from '../../schemas/index.js';

export type UiElementType = z.infer<typeof UiElementSchema>;

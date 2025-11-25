import { z } from 'zod';
import { UiElementSchema } from '../../schemas';

export type UiElementType = z.infer<typeof UiElementSchema>;
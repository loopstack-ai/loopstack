import { z } from 'zod';
import { UiPropertiesSchema } from '../../schemas';

export type UiPropertiesType = z.infer<typeof UiPropertiesSchema>;

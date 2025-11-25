import { z } from 'zod';
import { UiPropertiesSchema } from '../../schemas';

export interface UiPropertiesType extends z.infer<typeof UiPropertiesSchema> {
}
import { z } from 'zod';
import { UiFormButtonOptionsSchema, UiFormButtonSchema, UiFormSchema, UiWidgetSchema } from '../../schemas';

export type UiFormButtonOptionsType = z.infer<typeof UiFormButtonOptionsSchema>;
export type UiFormButtonType = z.infer<typeof UiFormButtonSchema>;
export type UiWidgetType = z.infer<typeof UiWidgetSchema>;
export type UiFormType = z.infer<typeof UiFormSchema>;

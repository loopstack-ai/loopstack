import { z } from 'zod';
import { UiFormActionSchema, UiFormSchema, UiWidgetSchema } from '../../schemas';

export type UiWidgetType = z.infer<typeof UiWidgetSchema>;
export type UiFormActionType = z.infer<typeof UiFormActionSchema>;
export type UiFormType = z.infer<typeof UiFormSchema>;

/** @deprecated Use UiFormActionType instead */
export type UiFormButtonOptionsType = UiFormActionType;
/** @deprecated Use UiWidgetType instead */
export type UiFormButtonType = UiWidgetType;

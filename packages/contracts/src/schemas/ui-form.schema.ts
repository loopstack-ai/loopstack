import { discriminatedUnion, z } from 'zod';
import { UiPropertiesSchema } from './ui-properties-schema';

export const UiFormBaseSchema = z.object({
  transition: z.string(),
  widget: z.string().optional(),
  enabledWhen: z.array(z.string()).optional(),
});

export const UiFormButtonOptionsSchema = z.object({
  position: z.number().optional(),
  label: z.string().optional(),
  variant: z.string().optional(),
  props: z.record(z.any()).optional(),
});

export const UiFormButtonSchema = UiFormBaseSchema.extend({
  type: z.literal('button'),
  options: z
    .object({
      position: z.number().optional(),
      label: z.string().optional(),
      props: z.record(z.any()).optional(),
    })
    .optional(),
});

export const UiFormCustomSchema = UiFormBaseSchema.extend({
  type: z.literal('custom'),
  options: z
    .object({
      label: z.string().optional(),
      props: z.record(z.any()).optional(),
    })
    .optional(),
});

export const UiWidgetSchema = discriminatedUnion('type', [UiFormButtonSchema, UiFormCustomSchema]);

export const UiFormSchema = z.object({
  actions: z.array(UiWidgetSchema).optional(),
  form: UiPropertiesSchema.optional(),
});

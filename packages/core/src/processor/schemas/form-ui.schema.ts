import { z } from 'zod';

export const FormUIOptionsSchema = z.object({
  label: z.boolean().optional(),
  rows: z.number().int().positive().optional(),
  inline: z.boolean().optional(),
  inputType: z.string().optional(),
  placeholder: z.string().optional(),
  emptyValue: z.any().optional(),
  help: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  enumOptions: z.array(
    z.object({
      label: z.string(),
      value: z.any()
    })
  ).optional(),
  titleFormat: z.string().optional(),
  addable: z.boolean().optional(),
  removable: z.boolean().optional(),
  movable: z.boolean().optional(),
  accept: z.string().optional(),
  multiple: z.boolean().optional()
});

export const FormUISubmitButtonOptionsSchema = z.object({
  submitText: z.string().optional(),
  props: z.record(z.any()).optional(),
  norender: z.boolean().optional()
});

export const FormUIObjectSchema = z.object({
  'ui:widget': z.string().optional(),
  'ui:options': FormUIOptionsSchema.optional(),
  'ui:placeholder': z.string().optional(),
  'ui:help': z.string().optional(),
  'ui:title': z.string().optional(),
  'ui:description': z.string().optional(),
  'ui:autofocus': z.boolean().optional(),
  'ui:disabled': z.boolean().optional(),
  'ui:readonly': z.boolean().optional(),
  'ui:order': z.array(z.string()).optional(),
  'ui:enumDisabled': z.array(z.string()).optional(),
  'ui:rootFieldId': z.string().optional(),
  'ui:classNames': z.string().optional()
}).catchall(z.any());

export const FormUISchema = z.object({
  'ui:submitButtonOptions': FormUISubmitButtonOptionsSchema.optional()
}).catchall(z.union([FormUIObjectSchema, z.any()]));

export type UIOptions = z.infer<typeof FormUIOptionsSchema>;
export type UISchemaObject = z.infer<typeof FormUIObjectSchema>;
export type UISchema = z.infer<typeof FormUISchema>;

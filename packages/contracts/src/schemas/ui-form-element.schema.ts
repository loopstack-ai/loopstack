import { z } from 'zod';

export const UiElementSchema = z.object({
  widget: z.string().optional(),
  index: z.number().optional(),
  label: z.string().optional(),
  descriptions: z.string().optional(),
  placeholder: z.string().optional(),
  rows: z.number().int().positive().optional(),
  inline: z.boolean().optional(),
  inputType: z.string().optional(),
  emptyValue: z.any().optional(),
  help: z.string().optional(),
  title: z.string().optional(),
  enumOptions: z.union([
    z.array(
      z.union([
        z.object({
          label: z.string(),
          value: z.any()
        }),
        z.string(),
      ]),
    ),
    z.string()
  ]).optional(),
  titleFormat: z.string().optional(),
  addable: z.boolean().optional(),
  removable: z.boolean().optional(),
  movable: z.boolean().optional(),
  accept: z.string().optional(),
  multiple: z.boolean().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readonly: z.boolean().optional(),
  collapsed: z.boolean().optional(),

  order: z.array(z.string()).optional(),
});


import { z } from 'zod';

export const UiElementSchema = z.object({
  widget: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  rows: z.number().int().positive().optional(),
  inline: z.boolean().optional(),
  help: z.string().optional(),
  title: z.string().optional(),
  enumOptions: z
    .union([
      z.array(
        z.union([
          z.object({
            label: z.string(),
            value: z.any(),
          }),
          z.string(),
        ]),
      ),
      z.string(),
    ])
    .optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readonly: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  fixed: z.boolean().optional(),
  order: z.array(z.string()).optional(),
});

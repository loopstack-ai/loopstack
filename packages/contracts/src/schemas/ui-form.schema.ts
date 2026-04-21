import { z } from 'zod';

// ── Top-level widget entry (used in ui.widgets[]) ───────
export const UiWidgetSchema = z.object({
  widget: z.string(),
  enabledWhen: z.array(z.string()).optional(),
  showWhen: z.array(z.string()).optional(),
  options: z.record(z.string(), z.any()).optional(),
});

// ── Form action (used inside widget: form → options.actions[]) ──
export const UiFormActionSchema = z.object({
  type: z.string(),
  transition: z.string().optional(),
  label: z.string().optional(),
  variant: z.string().optional(),
  props: z.record(z.string(), z.any()).optional(),
});

// ── Root UI schema ──────────────────────────────────────
export const UiFormSchema = z.object({
  widgets: z.array(UiWidgetSchema).optional(),
});

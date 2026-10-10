const BUTTON_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * The style a widget asked for, or nothing when it asked for none or for one that does not exist.
 *
 * A workflow-level button is often the lesser of the actions on offer — an escape hatch beside the thing you
 * normally do — and a form's first action is not always its primary one. The declaration decides, not the
 * position.
 */
export function buttonVariant(asked: unknown): ButtonVariant | undefined {
  return typeof asked === 'string' && (BUTTON_VARIANTS as readonly string[]).includes(asked)
    ? (asked as ButtonVariant)
    : undefined;
}

/** The primary widget a document's UI config declares; undefined when it declares none. */
export function resolveWidgetName(ui: unknown): string | undefined {
  const typed = ui as { widgets?: { widget?: string }[]; form?: { widget?: string } } | undefined;
  return typed?.widgets?.[0]?.widget ?? typed?.form?.widget;
}

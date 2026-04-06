/**
 * Function signature for rendering a template file with Handlebars.
 *
 * @param path - Absolute path to the template file (typically `__dirname + '/templates/foo.md'`)
 * @param data - Optional data context passed to Handlebars
 * @returns The rendered string
 */
export type TemplateRenderFn = (path: string, data?: Record<string, unknown>) => string;

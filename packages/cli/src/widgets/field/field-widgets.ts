import pc from 'picocolors';
import type { FieldWidget } from '../types.js';

/**
 * Field widgets — Studio's `dynamic-form/fields/` counterpart. Input widgets
 * (`input`, `textarea`, `number`, `checkbox`, `radio`, `switch`, `select`,
 * `slider`, or none) all render as key/value: the CLI edits data, not
 * widgets, so their distinction only matters to Studio. View widgets render
 * their content as a labeled block. Unknown widgets render the raw value as
 * JSON — a custom widget needs an implementation here before it renders
 * (or edits) any other way.
 */

/** YAML-ish default: `key: value` inline, multi-line values below the label. */
const defaultField: FieldWidget = (key, value) => formatEntry(key, value, 0);

const markdownView: FieldWidget = (key, value) =>
  labeledBlock(key, typeof value === 'string' ? value : JSON.stringify(value));

const codeView: FieldWidget = (key, value) =>
  labeledBlock(key, typeof value === 'string' ? stripCodeFences(value) : JSON.stringify(value));

const jsonField: FieldWidget = (key, value) => labeledBlock(key, JSON.stringify(value, null, 2));

const FIELD_WIDGETS = new Map<string, FieldWidget>([
  ['input', defaultField],
  ['textarea', defaultField],
  ['number', defaultField],
  ['checkbox', defaultField],
  ['radio', defaultField],
  ['switch', defaultField],
  ['select', defaultField],
  ['slider', defaultField],
  ['markdown-view', markdownView],
  ['code-view', codeView],
]);

/** No widget configured → default input rendering; unknown widget → JSON. */
export function resolveFieldWidget(widgetName: string | undefined): FieldWidget {
  if (!widgetName) return defaultField;
  return FIELD_WIDGETS.get(widgetName) ?? jsonField;
}

function labeledBlock(key: string, text: string): string[] {
  return [pc.dim(`${key}:`), ...text.split('\n')];
}

/**
 * One content entry as YAML-ish lines: dim keys, white values, nested
 * objects and arrays indented, multi-line strings below their label with
 * wrapping code fences stripped.
 */
export function formatEntry(key: string, value: unknown, indent: number): string[] {
  const pad = '  '.repeat(indent);
  if (value == null) return [];
  if (Array.isArray(value)) {
    const lines = [`${pad}${pc.dim(`${key}:`)}`];
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        lines.push(`${pad}  -`);
        lines.push(...formatEntries(item as Record<string, unknown>, indent + 2));
      } else {
        lines.push(`${pad}  - ${formatScalar(item)}`);
      }
    }
    return lines;
  }
  if (typeof value === 'object') {
    return [`${pad}${pc.dim(`${key}:`)}`, ...formatEntries(value as Record<string, unknown>, indent + 1)];
  }
  const text = formatScalar(value);
  if (text.includes('\n')) {
    return [`${pad}${pc.dim(`${key}:`)}`, ...text.split('\n').map((line) => `${pad}${line}`)];
  }
  return [`${pad}${pc.dim(`${key}:`)} ${text}`];
}

export function formatEntries(obj: Record<string, unknown>, indent: number): string[] {
  return Object.entries(obj).flatMap(([key, value]) => formatEntry(key, value, indent));
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') return stripCodeFences(value);
  return JSON.stringify(value);
}

/** `\`\`\`lang\n…\n\`\`\`` → the bare content — terminals need no fences. */
export function stripCodeFences(text: string): string {
  const match = text.trim().match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  return match ? match[1] : text;
}

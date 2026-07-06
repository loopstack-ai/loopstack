import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';

interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, { type?: string; description?: string; default?: unknown }>;
  required?: string[];
}

/** Type-aware empty value for a schema property — the field shows up ready to fill. */
function emptyValue(property: { type?: string; default?: unknown }): unknown {
  if (property.default !== undefined) return property.default;
  switch (property.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

/** Initial editor payload: the document's current content, else a schema-shaped skeleton. */
export function buildFormSkeleton(content: unknown, schema?: Record<string, unknown>): Record<string, unknown> {
  if (content && typeof content === 'object' && Object.keys(content).length > 0) {
    return content as Record<string, unknown>;
  }
  const typed = schema as JsonSchemaLike | undefined;
  if (typed?.type === 'object' && typed.properties) {
    return Object.fromEntries(Object.entries(typed.properties).map(([key, property]) => [key, emptyValue(property)]));
  }
  return {};
}

/** One line per schema field — printed before the editor opens so types are known. */
export function describeFormFields(schema?: Record<string, unknown>): string[] {
  const typed = schema as JsonSchemaLike | undefined;
  if (typed?.type !== 'object' || !typed.properties) return [];
  const required = new Set(typed.required ?? []);
  return Object.entries(typed.properties).map(([key, property]) => {
    const parts = [property.type ?? 'any'];
    if (required.has(key)) parts.push('required');
    const description = property.description ? ` — ${property.description}` : '';
    return `  ${key} (${parts.join(', ')})${description}`;
  });
}

/**
 * Opens `$EDITOR` on a temp JSON file seeded with `initial` and returns the
 * parsed payload — the escape hatch that makes every form answerable in the
 * terminal. Invalid JSON reopens the editor with the error noted; an emptied
 * file or a non-zero editor exit cancels (returns undefined).
 */
export function editPayloadInEditor(initial: Record<string, unknown>, out: NodeJS.WritableStream): unknown {
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  const dir = mkdtempSync(join(tmpdir(), 'loopstack-'));
  const file = join(dir, 'answer.json');
  writeFileSync(file, JSON.stringify(initial, null, 2) + '\n');

  try {
    while (true) {
      const result = spawnSync(`${editor} ${JSON.stringify(file)}`, { shell: true, stdio: 'inherit' });
      if (result.status !== 0) return undefined;
      const text = readFileSync(file, 'utf8').trim();
      if (!text) return undefined;
      try {
        return JSON.parse(text);
      } catch (error) {
        out.write(pc.red(`invalid JSON (${error instanceof Error ? error.message : String(error)}) — reopening…\n`));
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

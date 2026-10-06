import { ValueTransformer } from 'typeorm';

/**
 * Postgres `jsonb` is backed by its text type, which cannot represent U+0000: an insert carrying one
 * is rejected with `unsupported Unicode escape sequence`, and unpaired UTF-16 surrogates are rejected
 * the same way. Neither can be produced by our own code — they arrive from the outside world, in a tool
 * that read a binary file, a subprocess whose output was not valid UTF-8, or an LLM transcript quoting
 * either of those. No caller can promise the invariant, and the price of breaking it is steep: the
 * failing insert takes down the transition that produced it, and a retry replays the same payload, so a
 * single stray byte ends the run for good. The scrub therefore sits on the value's way into every jsonb
 * column, where the constraint actually lives.
 *
 * U+0000 is dropped — it carries no meaning for a reader and there is nothing to put in its place. A
 * lone surrogate becomes U+FFFD, the replacement character it already stands for.
 */

// Both characters are built rather than written as escapes, and the pattern comes from a string rather
// than a regex literal, because prettier folds a U+0000 escape into a raw control byte — which would
// put the very thing this file removes into this file.
const NUL = String.fromCharCode(0);
const REPLACEMENT = String.fromCharCode(0xfffd);
const UNSTORABLE = new RegExp(
  // eslint-disable-next-line no-control-regex -- matching U+0000 is the whole point of this file.
  '\\u0000|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]',
  'g',
);

/** Tracks whether a walk had to change anything, so an untouched value can be handed on as-is. */
interface ScrubState {
  changed: boolean;
}

function scrub(text: string, state: ScrubState): string {
  const scrubbed = text.replace(UNSTORABLE, (match) => (match === NUL ? '' : REPLACEMENT));
  if (scrubbed !== text) {
    state.changed = true;
  }
  return scrubbed;
}

/**
 * Walks the value the way `JSON.stringify` will: `toJSON()` first (so a `Date` or a `Buffer` is seen as
 * the string or object it serializes to), then arrays, then own enumerable properties — which covers
 * class instances such as the `ZodError` stored in a document's validation error, whose messages quote
 * the offending content.
 */
function visit(value: unknown, state: ScrubState): unknown {
  if (typeof value === 'string') {
    return scrub(value, state);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const serializable = value as { toJSON?: () => unknown };
  if (typeof serializable.toJSON === 'function') {
    return visit(serializable.toJSON(), state);
  }

  if (Array.isArray(value)) {
    return value.map((item) => visit(item, state));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[scrub(key, state)] = visit(item, state);
  }
  return result;
}

/**
 * Removes everything Postgres cannot store in a `jsonb` column. Returns the original value untouched
 * when there was nothing to remove, so the ordinary path reaches the driver exactly as it does without
 * the scrub, and only a payload that would have been rejected is rebuilt.
 */
export function sanitizeForJsonb<T>(value: T): T {
  const state: ScrubState = { changed: false };
  const result = visit(value, state);
  return state.changed ? (result as T) : value;
}

/** Applied to every `jsonb` column so no writer has to remember the constraint. */
export class JsonbTransformer implements ValueTransformer {
  to(value: unknown): unknown {
    return sanitizeForJsonb(value);
  }

  from(value: unknown): unknown {
    return value;
  }
}

export const jsonbTransformer = new JsonbTransformer();

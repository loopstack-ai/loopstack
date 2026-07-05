import { readFileSync } from 'node:fs';
import { CliError } from '../errors.js';

/**
 * Parses repeated `--arg` pairs into a workflow args object.
 * `key=value` coerces JSON-ish values (numbers, booleans, objects); anything
 * that does not parse stays a string. `key=@path` reads the file — parsed as
 * JSON when it is JSON, raw text otherwise. `key=@-` reads stdin the same way
 * (`cat notes.txt | loopstack run summarize --arg notes=@-`).
 */
export function parseRunArgs(
  pairs: string[],
  readFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
  readStdin: () => string = () => readFileSync(0, 'utf8'),
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const pair of pairs) {
    const separator = pair.indexOf('=');
    if (separator <= 0) {
      throw new CliError(`Invalid --arg "${pair}" — expected key=value or key=@file.`);
    }
    const key = pair.slice(0, separator);
    const raw = pair.slice(separator + 1);
    const value =
      raw === '@-' ? readStdinArg(readStdin) : raw.startsWith('@') ? readArgFile(raw.slice(1), readFile) : raw;
    args[key] = coerce(value);
  }
  return args;
}

function readStdinArg(readStdin: () => string): string {
  try {
    return readStdin();
  } catch {
    throw new CliError('Cannot read --arg value from stdin (@-).');
  }
}

function readArgFile(path: string, readFile: (path: string) => string): string {
  try {
    return readFile(path);
  } catch {
    throw new CliError(`Cannot read --arg file "${path}".`);
  }
}

function coerce(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

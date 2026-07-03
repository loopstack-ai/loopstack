import { describe, expect, it } from 'vitest';
import { CliError } from '../errors.js';
import { parseRunArgs } from './args.js';

describe('parseRunArgs', () => {
  it('keeps plain strings and coerces JSON-ish values', () => {
    expect(parseRunArgs(['name=SDK', 'count=3', 'dry=true', 'payload={"a":1}'])).toEqual({
      name: 'SDK',
      count: 3,
      dry: true,
      payload: { a: 1 },
    });
  });

  it('splits at the first equals sign only', () => {
    expect(parseRunArgs(['query=a=b'])).toEqual({ query: 'a=b' });
  });

  it('reads @file values and parses JSON files', () => {
    const files: Record<string, string> = {
      'ticket.json': '{"id": 42}',
      'notes.txt': 'plain text',
    };
    const read = (path: string) => {
      if (!(path in files)) throw new Error('ENOENT');
      return files[path];
    };
    expect(parseRunArgs(['ticket=@ticket.json', 'notes=@notes.txt'], read)).toEqual({
      ticket: { id: 42 },
      notes: 'plain text',
    });
  });

  it('throws a CliError for unreadable files', () => {
    expect(() =>
      parseRunArgs(['x=@missing.json'], () => {
        throw new Error('ENOENT');
      }),
    ).toThrow(CliError);
  });

  it('throws a CliError for pairs without a key or equals sign', () => {
    expect(() => parseRunArgs(['novalue'])).toThrow(CliError);
    expect(() => parseRunArgs(['=x'])).toThrow(CliError);
  });
});

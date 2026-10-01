import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { JsonbTransformer } from '../../utils/jsonb-sanitizer.js';
import '../document.entity.js';
import '../run-trace-event.entity.js';
import '../workflow-checkpoint.entity.js';
import '../workflow.entity.js';

/**
 * A `jsonb` column that forgets the transformer is the bug this guards: Postgres rejects U+0000 outright,
 * so the column would take any ordinary payload and then fail the transition on the first tool output that
 * quoted a binary file — permanently, since the retry replays it.
 */
describe('jsonb columns', () => {
  const jsonbColumns = getMetadataArgsStorage().columns.filter((column) => {
    const type = typeof column.options.type === 'string' ? column.options.type : undefined;
    return type === 'jsonb';
  });

  it('finds every jsonb column across the entities', () => {
    expect(jsonbColumns.length).toBe(10);
  });

  it.each(jsonbColumns.map((column) => [`${(column.target as () => void).name}.${column.propertyName}`, column]))(
    '%s scrubs what Postgres cannot store',
    (_name, column) => {
      expect(column.options.transformer).toBeInstanceOf(JsonbTransformer);
    },
  );
});

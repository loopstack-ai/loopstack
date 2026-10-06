import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import '../api-token.entity.js';
import '../document.entity.js';
import '../run-trace-event.entity.js';
import '../user.entity.js';
import '../workflow-checkpoint.entity.js';
import '../workflow.entity.js';
import '../workspace.entity.js';

/**
 * A create/update date column without a type becomes a Postgres `timestamp` without time zone: `now()` writes
 * the session's wall-clock time and node-postgres reads it back as Node-local time, so every timestamp shifts
 * by the gap whenever the two timezones differ.
 */
describe('timestamp columns', () => {
  const dateColumns = getMetadataArgsStorage().columns.filter(
    (column) => column.mode === 'createDate' || column.mode === 'updateDate',
  );

  it('finds every create/update date column across the entities', () => {
    expect(dateColumns.length).toBe(11);
  });

  it.each(dateColumns.map((column) => [`${(column.target as () => void).name}.${column.propertyName}`, column]))(
    '%s stores an instant',
    (_name, column) => {
      expect(column.options.type).toBe('timestamptz');
    },
  );
});

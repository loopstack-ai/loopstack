import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { TestUiDocumentsWorkflow } from '../ui-documents-example.workflow';

/**
 * The concept under test: `documentStore.save(<DocumentClass>, content)` writes a document of that
 * built-in type, and the type is what Studio keys its renderer off. So assert one document per
 * built-in type, each carrying the content shape that type declares.
 *
 * Acceptance criteria:
 *   C1 — one document is saved for each built-in type, with that type's own content shape.
 */
describe('TestUiDocumentsWorkflow', () => {
  it('C1: saves one document of each built-in type', async () => {
    const run = await runWorkflow(TestUiDocumentsWorkflow);

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['renderAll', 'done']);

    expect(run.document('message')).toMatchObject({ role: 'assistant', text: 'This is the default message' });
    expect(run.document('error')).toMatchObject({ error: 'This is an error message' });
    expect(run.document('markdown')).toMatchObject({ markdown: '# Markdown\n\nThis is `markdown`\n' });
    expect(run.document('plain')).toMatchObject({ text: 'This is plain text' });

    const cov = coverage([run], TestUiDocumentsWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});

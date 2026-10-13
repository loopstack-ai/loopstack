import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { TemplateRenderer } from '../workflow-templates.js';

const dir = mkdtempSync(join(tmpdir(), 'workflow-templates-'));

function template(name: string, source: string): string {
  const path = join(dir, name);
  writeFileSync(path, source);
  return path;
}

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('TemplateRenderer', () => {
  const renderer = new TemplateRenderer();

  it('renders variables and blocks', () => {
    const path = template('plain.md', 'Hello {{name}}{{#each items}} - {{this}}{{/each}}');
    expect(renderer.render(path, { name: 'World', items: ['a', 'b'] })).toBe('Hello World - a - b');
  });

  it('branches on equality with `eq`', () => {
    const path = template(
      'eq.md',
      '{{#if (eq outcome "approved")}}Approved.{{/if}}{{#if (eq outcome "parked")}}Parked.{{/if}}',
    );
    expect(renderer.render(path, { outcome: 'approved' })).toBe('Approved.');
    expect(renderer.render(path, { outcome: 'parked' })).toBe('Parked.');
    expect(renderer.render(path, { outcome: 'closed' })).toBe('');
  });

  it('compares strictly — a number is not its string', () => {
    const path = template('strict.md', '{{#if (eq count 1)}}one{{else}}other{{/if}}');
    expect(renderer.render(path, { count: 1 })).toBe('one');
    expect(renderer.render(path, { count: '1' })).toBe('other');
  });
});

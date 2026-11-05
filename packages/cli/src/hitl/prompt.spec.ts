import { describe, expect, it } from 'vitest';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { ActivePrompt } from './discovery.js';
import { describePrompt } from './prompt.js';

function prompt(content: Record<string, unknown>): ActivePrompt {
  return {
    workflow: { availableTransitions: [{ id: 'handoffDone' }] } as unknown as WorkflowFullInterface,
    document: { content } as unknown as DocumentItemInterface,
  };
}

describe('describePrompt', () => {
  it('describes a document by its own title when it has no question or markdown', () => {
    expect(describePrompt(prompt({ command: 'bash', title: 'Interactive session' }))).toBe('Interactive session');
  });

  it('falls back to the available transitions', () => {
    expect(describePrompt(prompt({ command: 'bash' }))).toBe('transitions: handoffDone');
  });
});
